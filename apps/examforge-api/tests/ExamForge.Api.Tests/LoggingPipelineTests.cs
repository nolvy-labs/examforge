using System.Text.Json;
using System.Net;
using System.Net.Http.Json;

using ExamForge.Api.Common;
using ExamForge.Api.Common.Logging;
using ExamForge.Api.Configuration;
using ExamForge.Api.Extensions;
using ExamForge.Api.Filters;
using ExamForge.Api.Middleware;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Patterns;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Console;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace ExamForge.Api.Tests;

public sealed class CorrelationIdMiddlewareTests
{
    [Fact]
    public async Task AbsentHeader_GeneratesIdAndReturnsItInResponseAndScope()
    {
        var logger = new CapturingLogger<CorrelationIdMiddleware>();
        var context = await InvokeAsync(logger);

        var correlationId = CorrelationIdContext.Get(context);
        Assert.Equal(32, correlationId.Length);
        Assert.True(Guid.TryParseExact(correlationId, "N", out _));
        Assert.Equal(correlationId, context.Response.Headers[CorrelationIdContext.HeaderName]);
        Assert.Contains(logger.Scopes, scope =>
            GetProperties(scope).TryGetValue("CorrelationId", out var value) &&
            Equals(value, correlationId));
    }

    [Fact]
    public async Task ValidHeader_IsAccepted()
    {
        const string incoming = "client-request_123.test";
        var context = await InvokeAsync(
            new CapturingLogger<CorrelationIdMiddleware>(),
            new StringValues(incoming));

        Assert.Equal(incoming, CorrelationIdContext.Get(context));
        Assert.Equal(incoming, context.Response.Headers[CorrelationIdContext.HeaderName]);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("unsafe/value")]
    [InlineData("contains space")]
    public async Task InvalidHeader_IsReplaced(string incoming)
    {
        var context = await InvokeAsync(
            new CapturingLogger<CorrelationIdMiddleware>(),
            new StringValues(incoming));

        Assert.NotEqual(incoming, CorrelationIdContext.Get(context));
        Assert.True(Guid.TryParseExact(CorrelationIdContext.Get(context), "N", out _));
    }

    [Fact]
    public async Task OversizedHeader_IsReplaced()
    {
        var incoming = new string('a', CorrelationIdMiddleware.MaximumLength + 1);
        var context = await InvokeAsync(
            new CapturingLogger<CorrelationIdMiddleware>(),
            new StringValues(incoming));

        Assert.NotEqual(incoming, CorrelationIdContext.Get(context));
        Assert.True(Guid.TryParseExact(CorrelationIdContext.Get(context), "N", out _));
    }

    [Fact]
    public async Task MultipleHeaderValues_AreRejected()
    {
        var context = await InvokeAsync(
            new CapturingLogger<CorrelationIdMiddleware>(),
            new StringValues(["first", "second"]));

        Assert.NotEqual("first", CorrelationIdContext.Get(context));
        Assert.NotEqual("second", CorrelationIdContext.Get(context));
        Assert.True(Guid.TryParseExact(CorrelationIdContext.Get(context), "N", out _));
    }

    private static async Task<DefaultHttpContext> InvokeAsync(
        CapturingLogger<CorrelationIdMiddleware> logger,
        StringValues? header = null)
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        if (header.HasValue)
        {
            context.Request.Headers[CorrelationIdContext.HeaderName] = header.Value;
        }

        var middleware = new CorrelationIdMiddleware(
            next => next.Response.WriteAsync("ok"),
            logger);
        await middleware.InvokeAsync(context);
        await context.Response.StartAsync();
        return context;
    }

    private static IReadOnlyDictionary<string, object?> GetProperties(object? state) =>
        state is IEnumerable<KeyValuePair<string, object?>> properties
            ? properties.ToDictionary(pair => pair.Key, pair => pair.Value)
            : new Dictionary<string, object?>();
}

public sealed class RequestLoggingMiddlewareTests
{
    [Fact]
    public async Task NormalRequest_ProducesOneStructuredCompletionEventWithoutSensitiveInput()
    {
        var logger = new CapturingLogger<RequestLoggingMiddleware>();
        var context = CreateContext();
        context.Request.QueryString = new QueryString("?token=never-log-this");
        context.Request.Headers.Authorization = "Bearer never-log-this";
        context.Request.Body = new MemoryStream("request-body-secret"u8.ToArray());

        var middleware = CreateMiddleware(_ => Task.CompletedTask, logger, 60_000);
        await middleware.InvokeAsync(context);

        var entry = Assert.Single(logger.Entries);
        Assert.Equal(LogLevel.Information, entry.Level);
        Assert.Equal(LogEvents.RequestCompleted, entry.EventId);
        Assert.Equal("GET", entry.Properties["HttpMethod"]);
        Assert.Equal("/api/v1/exams/{examId:guid}", entry.Properties["RouteTemplate"]);
        Assert.Equal(200, entry.Properties["StatusCode"]);
        Assert.Equal("2xx", entry.Properties["StatusCodeClass"]);
        Assert.Equal("correlation-123", entry.Properties["CorrelationId"]);
        Assert.True(Convert.ToDouble(entry.Properties["ElapsedMilliseconds"]) >= 0);

        var serializedState = JsonSerializer.Serialize(entry.Properties);
        Assert.DoesNotContain("never-log-this", serializedState);
        Assert.DoesNotContain("request-body-secret", serializedState);
    }

    [Fact]
    public async Task SlowRequest_UsesWarningAndSlowRequestEvent()
    {
        var logger = new CapturingLogger<RequestLoggingMiddleware>();
        var middleware = CreateMiddleware(
            async _ => await Task.Delay(20),
            logger,
            slowThresholdMilliseconds: 1);

        await middleware.InvokeAsync(CreateContext());

        var entry = Assert.Single(logger.Entries);
        Assert.Equal(LogLevel.Warning, entry.Level);
        Assert.Equal(LogEvents.SlowRequest, entry.EventId);
    }

    [Fact]
    public async Task SuccessfulHealthRequest_IsSuppressedButFailureIsLogged()
    {
        var logger = new CapturingLogger<RequestLoggingMiddleware>();
        var healthy = CreateContext("/health/live");
        await CreateMiddleware(_ => Task.CompletedTask, logger, 60_000).InvokeAsync(healthy);
        Assert.Empty(logger.Entries);

        var unhealthy = CreateContext("/health/ready");
        unhealthy.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        await CreateMiddleware(_ => Task.CompletedTask, logger, 60_000).InvokeAsync(unhealthy);
        Assert.Single(logger.Entries);
    }

    private static RequestLoggingMiddleware CreateMiddleware(
        RequestDelegate next,
        CapturingLogger<RequestLoggingMiddleware> logger,
        int slowThresholdMilliseconds) =>
        new(
            next,
            logger,
            Options.Create(new RequestLoggingOptions
            {
                SlowRequestThresholdMilliseconds = slowThresholdMilliseconds
            }));

    private static DefaultHttpContext CreateContext(
        string routeTemplate = "/api/v1/exams/{examId:guid}")
    {
        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Get;
        context.Request.Scheme = "https";
        context.Request.Path = "/api/v1/exams/4fe5fb30-03dc-4b2d-b815-36e31bd96398";
        context.Response.StatusCode = StatusCodes.Status200OK;
        context.Items["ExamForge.CorrelationId"] = "correlation-123";
        context.SetEndpoint(new RouteEndpoint(
            _ => Task.CompletedTask,
            RoutePatternFactory.Parse(routeTemplate),
            order: 0,
            EndpointMetadataCollection.Empty,
            displayName: routeTemplate));
        return context;
    }
}

public sealed class ApiExceptionHandlingMiddlewareTests
{
    [Fact]
    public async Task UnexpectedException_IsLoggedOnceAndReturnsSafeProblemDetails()
    {
        var logger = new CapturingLogger<ApiExceptionHandlingMiddleware>();
        var expectedException = new InvalidOperationException("database connection secret");
        var context = CreateContext();
        var middleware = new ApiExceptionHandlingMiddleware(
            _ => throw expectedException,
            logger);

        await middleware.InvokeAsync(context);

        var entry = Assert.Single(logger.Entries);
        Assert.Equal(LogEvents.UnexpectedException, entry.EventId);
        Assert.Same(expectedException, entry.Exception);
        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);

        context.Response.Body.Position = 0;
        using var document = await JsonDocument.ParseAsync(context.Response.Body);
        var root = document.RootElement;
        Assert.Equal("An unexpected error occurred.", root.GetProperty("detail").GetString());
        Assert.Equal("correlation-123", root.GetProperty("correlationId").GetString());
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("traceId").GetString()));
        Assert.DoesNotContain("database connection secret", root.GetRawText());
        Assert.DoesNotContain(nameof(InvalidOperationException), root.GetRawText());
    }

    [Fact]
    public async Task ExpectedResponse_DoesNotProduceUnexpectedExceptionLog()
    {
        var logger = new CapturingLogger<ApiExceptionHandlingMiddleware>();
        var context = CreateContext();
        var middleware = new ApiExceptionHandlingMiddleware(
            next =>
            {
                next.Response.StatusCode = StatusCodes.Status409Conflict;
                return Task.CompletedTask;
            },
            logger);

        await middleware.InvokeAsync(context);

        Assert.Empty(logger.Entries);
        Assert.Equal(StatusCodes.Status409Conflict, context.Response.StatusCode);
    }

    [Fact]
    public async Task RequestCompletion_DoesNotDuplicateUnexpectedExceptionLog()
    {
        var exceptionLogger = new CapturingLogger<ApiExceptionHandlingMiddleware>();
        var requestLogger = new CapturingLogger<RequestLoggingMiddleware>();
        var context = CreateContext();
        var exceptionMiddleware = new ApiExceptionHandlingMiddleware(
            _ => throw new InvalidOperationException("test failure"),
            exceptionLogger);
        var requestMiddleware = new RequestLoggingMiddleware(
            exceptionMiddleware.InvokeAsync,
            requestLogger,
            Options.Create(new RequestLoggingOptions
            {
                SlowRequestThresholdMilliseconds = 60_000
            }));

        await requestMiddleware.InvokeAsync(context);

        Assert.Single(exceptionLogger.Entries);
        var completion = Assert.Single(requestLogger.Entries);
        Assert.Equal(LogEvents.RequestCompleted, completion.EventId);
        Assert.Null(completion.Exception);
        Assert.Equal(StatusCodes.Status500InternalServerError, completion.Properties["StatusCode"]);
    }

    [Fact]
    public async Task ClientCancellation_IsNotLoggedAsUnexpectedFailure()
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var logger = new CapturingLogger<ApiExceptionHandlingMiddleware>();
        var context = CreateContext();
        context.RequestAborted = cancellation.Token;
        var middleware = new ApiExceptionHandlingMiddleware(
            _ => throw new OperationCanceledException(cancellation.Token),
            logger);

        await middleware.InvokeAsync(context);

        Assert.Empty(logger.Entries);
        Assert.Equal(499, context.Response.StatusCode);
    }

    private static DefaultHttpContext CreateContext()
    {
        var context = new DefaultHttpContext();
        context.TraceIdentifier = "trace-123";
        context.Response.Body = new MemoryStream();
        context.Items["ExamForge.CorrelationId"] = "correlation-123";
        context.SetEndpoint(new RouteEndpoint(
            _ => Task.CompletedTask,
            RoutePatternFactory.Parse("/api/v1/test/{id:guid}"),
            0,
            EndpointMetadataCollection.Empty,
            "test"));
        return context;
    }
}

public sealed class ProblemDetailsMetadataTests
{
    [Fact]
    public void Filter_AddsRequestMetadataAndPreservesDomainErrorContract()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.TraceIdentifier = "trace-123";
        httpContext.Items["ExamForge.CorrelationId"] = "correlation-123";
        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "Conflict",
            Detail = "The exam version is not ready for publication."
        };
        var result = new ObjectResult(problem) { StatusCode = problem.Status };
        var actionContext = new ActionContext(
            httpContext,
            new RouteData(),
            new ActionDescriptor());
        var executingContext = new ResultExecutingContext(
            actionContext,
            [],
            result,
            controller: new object());

        new ProblemDetailsMetadataFilter().OnResultExecuting(executingContext);

        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Equal("Conflict", problem.Title);
        Assert.Equal("The exam version is not ready for publication.", problem.Detail);
        Assert.Equal("correlation-123", problem.Extensions["correlationId"]);
        Assert.False(string.IsNullOrWhiteSpace(problem.Extensions["traceId"]?.ToString()));
    }
}

public sealed class RequestLoggingConfigurationTests
{
    [Fact]
    public void SlowRequestThreshold_BindsFromConfiguration()
    {
        using var provider = BuildProvider("2500");

        var options = provider.GetRequiredService<IOptions<RequestLoggingOptions>>().Value;

        Assert.Equal(2500, options.SlowRequestThresholdMilliseconds);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("300001")]
    public void InvalidSlowRequestThreshold_FailsValidation(string value)
    {
        using var provider = BuildProvider(value);

        Assert.Throws<OptionsValidationException>(() =>
            provider.GetRequiredService<IOptions<RequestLoggingOptions>>().Value);
    }

    private static ServiceProvider BuildProvider(string threshold)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [$"{RequestLoggingOptions.SectionName}:SlowRequestThresholdMilliseconds"] = threshold
            })
            .Build();
        var services = new ServiceCollection();
        services.AddRequestLogging(configuration);
        return services.BuildServiceProvider();
    }
}

public sealed class LoggingPipelineIntegrationTests
{
    [Fact]
    public async Task AutomaticProblemDetails_HasCorrelationHeaderAndRequestMetadata()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/login")
        {
            Content = JsonContent.Create(new { })
        };
        request.Headers.Add(CorrelationIdContext.HeaderName, "integration-request-123");

        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(
            "integration-request-123",
            response.Headers.GetValues(CorrelationIdContext.HeaderName).Single());
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(
            "integration-request-123",
            document.RootElement.GetProperty("correlationId").GetString());
        Assert.False(string.IsNullOrWhiteSpace(
            document.RootElement.GetProperty("traceId").GetString()));
    }

    [Fact]
    public void JsonConsoleProviderAndScopes_AreRegisteredOnce()
    {
        using var factory = CreateFactory();

        var providers = factory.Services.GetServices<ILoggerProvider>();
        Assert.Single(providers.OfType<ConsoleLoggerProvider>());
        var formatterOptions = factory.Services
            .GetRequiredService<IOptionsMonitor<JsonConsoleFormatterOptions>>();
        Assert.True(formatterOptions.CurrentValue.IncludeScopes);
        Assert.True(formatterOptions.CurrentValue.UseUtcTimestamp);
        Assert.Equal(
            LogLevel.Error,
            factory.Services.GetRequiredService<IOptions<ConsoleLoggerOptions>>()
                .Value.LogToStandardErrorThreshold);
    }

    private static WebApplicationFactory<Program> CreateFactory() =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.UseSetting(
                "ConnectionStrings:DefaultConnection",
                "Host=localhost;Database=examforge_tests;Username=examforge;Password=examforge");
            builder.UseSetting("Jwt:Issuer", "ExamForge.Tests");
            builder.UseSetting("Jwt:Audience", "ExamForge.Tests.Client");
            builder.UseSetting(
                "Jwt:Secret",
                "examforge-tests-only-secret-that-is-at-least-64-characters-long-123456789");
            builder.ConfigureTestServices(services => services.RemoveAll<IHostedService>());
        });
}

internal sealed record CapturedLog(
    LogLevel Level,
    EventId EventId,
    Exception? Exception,
    string Message,
    IReadOnlyDictionary<string, object?> Properties);

internal sealed class CapturingLogger<T> : ILogger<T>
{
    public List<CapturedLog> Entries { get; } = [];
    public List<object?> Scopes { get; } = [];

    public IDisposable BeginScope<TState>(TState state) where TState : notnull
    {
        Scopes.Add(state);
        return Scope.Instance;
    }

    public bool IsEnabled(LogLevel logLevel) => true;

    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        var properties = state is IEnumerable<KeyValuePair<string, object?>> pairs
            ? pairs.ToDictionary(pair => pair.Key, pair => pair.Value)
            : new Dictionary<string, object?>();
        Entries.Add(new(
            logLevel,
            eventId,
            exception,
            formatter(state, exception),
            properties));
    }

    private sealed class Scope : IDisposable
    {
        public static readonly Scope Instance = new();

        public void Dispose()
        {
        }
    }
}
