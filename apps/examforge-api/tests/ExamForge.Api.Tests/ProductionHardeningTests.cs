using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;

using ExamForge.Api.Common.Constants;
using ExamForge.Api.Configuration;
using ExamForge.Api.Extensions;
using ExamForge.Domain.Users;
using ExamForge.Infrastructure;
using ExamForge.Infrastructure.Auth;
using ExamForge.Infrastructure.Persistence;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ExamForge.Api.Tests;

public sealed class ProductionConfigurationValidationTests
{
    [Theory]
    [InlineData("*")]
    [InlineData("")]
    [InlineData("api.examforge.io.vn;*")]
    public void ProductionWildcardOrMissingAllowedHosts_IsRejected(string allowedHosts)
    {
        Assert.False(ProductionConfigurationValidation.HasValidProductionHost(allowedHosts));
    }

    [Fact]
    public void MissingProductionCorsOrigins_IsRejected()
    {
        Assert.False(ProductionConfigurationValidation.HasValidProductionCorsOrigins(
            new CorsSettings()));
    }

    [Theory]
    [InlineData("http://study.example.com")]
    [InlineData("https://*.example.com")]
    [InlineData("*")]
    [InlineData("https://study.example.com/path")]
    [InlineData("https://study.example.com?query=value")]
    [InlineData("https://study.example.com/#fragment")]
    [InlineData("https://study.example.com/")]
    public void InvalidProductionCorsOrigin_IsRejected(string origin)
    {
        Assert.False(ProductionConfigurationValidation.HasValidProductionCorsOrigins(
            new CorsSettings { AllowedOrigins = [origin] }));
    }

    [Fact]
    public void ExactProductionHttpsOrigins_AreAccepted()
    {
        Assert.True(ProductionConfigurationValidation.HasValidProductionCorsOrigins(
            new CorsSettings
            {
                AllowedOrigins =
                [
                    "https://study.example.com",
                    "https://admin.example.com"
                ]
            }));
    }

    [Fact]
    public void MissingJwtSecret_IsRejected()
    {
        Assert.False(ProductionConfigurationValidation.HasValidJwt(new JwtOptions
        {
            Issuer = "ExamForge.Tests",
            Audience = "ExamForge.Tests.Client",
            Secret = string.Empty,
            AccessTokenMinutes = 15,
            RefreshTokenDays = 7
        }));
    }

    [Fact]
    public void ShortJwtSecret_IsRejected()
    {
        Assert.False(ProductionConfigurationValidation.HasValidJwt(new JwtOptions
        {
            Issuer = "ExamForge.Tests",
            Audience = "ExamForge.Tests.Client",
            Secret = "too-short",
            AccessTokenMinutes = 15,
            RefreshTokenDays = 7
        }));
    }

    [Fact]
    public void MissingDatabaseConnection_IsRejected()
    {
        var configuration = new ConfigurationBuilder().Build();

        Assert.Throws<InvalidOperationException>(() =>
            new ServiceCollection().AddInfrastructure(configuration));
    }

    [Theory]
    [InlineData("not-an-ip", null)]
    [InlineData(null, "not-a-cidr")]
    [InlineData(null, "10.0.0.0")]
    public void InvalidProxyIpOrCidr_IsRejected(string? proxy, string? network)
    {
        var settings = new ForwardedHeadersSettings
        {
            KnownProxies = proxy is null ? [] : [proxy],
            KnownNetworks = network is null ? [] : [network]
        };

        Assert.False(ProductionConfigurationValidation.HasValidForwardedHeaders(
            settings,
            requireTrustedSource: true));
    }

    [Fact]
    public void MissingTrustedProxyOrNetwork_IsRejectedInProduction()
    {
        Assert.False(ProductionConfigurationValidation.HasValidForwardedHeaders(
            new ForwardedHeadersSettings(),
            requireTrustedSource: true));
    }

    [Fact]
    public void InvalidRateLimit_IsRejected()
    {
        var settings = new RateLimitingSettings();
        settings.Global.TokenLimit = 0;

        Assert.False(ProductionConfigurationValidation.HasValidRateLimits(settings));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(31)]
    public void InvalidReadinessTimeout_IsRejected(int timeoutSeconds)
    {
        Assert.False(ProductionConfigurationValidation.HasValidHealthChecks(
            new ApiHealthCheckSettings { ReadinessTimeoutSeconds = timeoutSeconds }));
    }

}

public sealed class ForwardedHttpsPipelineTests
{
    [Fact]
    public async Task TrustedForwardedHttps_DoesNotRedirect()
    {
        var response = await InvokePipelineAsync(IPAddress.Loopback, "https");

        Assert.Equal(StatusCodes.Status204NoContent, response.StatusCode);
        Assert.False(response.Headers.ContainsKey("Location"));
    }

    [Fact]
    public async Task TrustedForwardedHttp_RedirectsToPublicHttpsHost()
    {
        var response = await InvokePipelineAsync(IPAddress.Loopback, "http");

        Assert.Equal(StatusCodes.Status307TemporaryRedirect, response.StatusCode);
        Assert.Equal(
            "https://api.examforge.io.vn/api/v1/auth/me",
            response.Headers.Location.ToString());
    }

    [Fact]
    public async Task UntrustedForgedForwardedHttps_IsIgnoredAndRedirected()
    {
        var response = await InvokePipelineAsync(IPAddress.Parse("203.0.113.10"), "https");

        Assert.Equal(StatusCodes.Status307TemporaryRedirect, response.StatusCode);
    }

    private static async Task<HttpResponse> InvokePipelineAsync(
        IPAddress remoteAddress,
        string forwardedProto)
    {
        using var loggerFactory = LoggerFactory.Create(_ => { });
        var httpsRedirect = new HttpsRedirectionMiddleware(
            context =>
            {
                context.Response.StatusCode = StatusCodes.Status204NoContent;
                return Task.CompletedTask;
            },
            Options.Create(new HttpsRedirectionOptions { HttpsPort = 443 }),
            new ConfigurationBuilder().Build(),
            loggerFactory);
        var forwardedHeaders = new ForwardedHeadersMiddleware(
            httpsRedirect.Invoke,
            loggerFactory,
            Options.Create(new ForwardedHeadersOptions
        {
            ForwardedHeaders =
                ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
            ForwardLimit = 1,
            KnownProxies = { IPAddress.Loopback }
        }));

        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = remoteAddress;
        context.Request.Scheme = "http";
        context.Request.Host = new HostString(HostingSettings.ProductionHost);
        context.Request.Path = "/api/v1/auth/me";
        context.Request.Headers["X-Forwarded-Proto"] = forwardedProto;

        await forwardedHeaders.Invoke(context);
        return context.Response;
    }
}

public sealed class ProductionPipelineIntegrationTests
{
    [Fact]
    public async Task ProductionResponse_HasSecurityHeaders()
    {
        await using var factory = HardeningApiFactory.CreateProduction();
        using var client = factory.CreateClient(HardeningApiFactory.ClientOptions());

        using var response = await client.GetAsync("/health/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("no-referrer", response.Headers.GetValues("Referrer-Policy").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        Assert.Contains("default-src 'none'", response.Headers.GetValues("Content-Security-Policy").Single());
        Assert.Contains("camera=()", response.Headers.GetValues("Permissions-Policy").Single());
    }

    [Fact]
    public async Task DevelopmentOpenApi_RemainsAvailableWithoutProductionSecurityHeaders()
    {
        await using var factory = HardeningApiFactory.CreateDevelopment();
        using var client = factory.CreateClient(HardeningApiFactory.ClientOptions("localhost"));

        using var response = await client.GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("Content-Security-Policy"));
    }

    [Fact]
    public async Task Liveness_DoesNotDependOnDatabase_AndHealthEndpointsBypassRateLimits()
    {
        await using var factory = HardeningApiFactory.CreateDevelopment(globalLimit: 1);
        using var client = factory.CreateClient(HardeningApiFactory.ClientOptions("localhost"));

        for (var attempt = 0; attempt < 4; attempt++)
        {
            using var response = await client.GetAsync("/health/live");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }

    [Fact]
    public async Task Readiness_IsHealthyWhenDatabaseCanConnect()
    {
        await using var factory = HardeningApiFactory.CreateDevelopment(useInMemoryDatabase: true);
        using var client = factory.CreateClient(HardeningApiFactory.ClientOptions("localhost"));
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ExamForgeDbContext>();
            await dbContext.Database.EnsureCreatedAsync();
        }

        using var response = await client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("{\"status\":\"Healthy\"}", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Readiness_ReturnsServiceUnavailableWhenDatabaseCannotConnect()
    {
        await using var factory = HardeningApiFactory.CreateDevelopment();
        using var client = factory.CreateClient(HardeningApiFactory.ClientOptions("localhost"));

        using var response = await client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("{\"status\":\"Unhealthy\"}", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task LoginLimiter_ReturnsProblemDetailsAndRetryAfter()
    {
        await using var factory = HardeningApiFactory.CreateDevelopment(authenticationLimit: 2);
        using var client = factory.CreateClient(HardeningApiFactory.ClientOptions("localhost"));

        using var first = await PostInvalidLoginAsync(client);
        using var second = await PostInvalidLoginAsync(client);
        using var rejected = await PostInvalidLoginAsync(client);

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.NotNull(rejected.Headers.RetryAfter);
        Assert.Equal("application/problem+json", rejected.Content.Headers.ContentType?.MediaType);
        var problem = await rejected.Content.ReadFromJsonAsync<Microsoft.AspNetCore.Mvc.ProblemDetails>();
        Assert.Equal(StatusCodes.Status429TooManyRequests, problem?.Status);
        Assert.Equal("Too Many Requests", problem?.Title);
        Assert.NotNull(problem);
        Assert.True(problem.Extensions.TryGetValue("correlationId", out var correlationId));
        Assert.False(string.IsNullOrWhiteSpace(correlationId?.ToString()));
    }

    [Fact]
    public async Task RefreshLimiter_ReturnsTooManyRequests()
    {
        await using var factory = HardeningApiFactory.CreateDevelopment(refreshLimit: 2);
        using var client = factory.CreateClient(HardeningApiFactory.ClientOptions("localhost"));

        using var first = await client.PostAsync("/api/v1/auth/refresh", null);
        using var second = await client.PostAsync("/api/v1/auth/refresh", null);
        using var rejected = await client.PostAsync("/api/v1/auth/refresh", null);

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
    }

    [Fact]
    public async Task AnonymousRequests_EventuallyReachGlobalLimit()
    {
        await using var factory = HardeningApiFactory.CreateDevelopment(globalLimit: 2);
        using var client = factory.CreateClient(HardeningApiFactory.ClientOptions("localhost"));

        using var first = await client.GetAsync("/api/v1/auth/me");
        using var second = await client.GetAsync("/api/v1/auth/me");
        using var rejected = await client.GetAsync("/api/v1/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, first.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, second.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
    }

    [Fact]
    public async Task AuthenticatedUsers_HaveSeparateGlobalPartitions()
    {
        await using var factory = HardeningApiFactory.CreateDevelopment(globalLimit: 1);
        using var client = factory.CreateClient(HardeningApiFactory.ClientOptions("localhost"));
        var firstUser = Guid.NewGuid();
        var secondUser = Guid.NewGuid();

        using var first = await GetMeAsync(client, HardeningApiFactory.CreateToken(firstUser));
        using var second = await GetMeAsync(client, HardeningApiFactory.CreateToken(secondUser));
        using var firstUserRejected = await GetMeAsync(
            client,
            HardeningApiFactory.CreateToken(firstUser));

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, firstUserRejected.StatusCode);
    }

    [Fact]
    public async Task PublicRegistration_IsHiddenWhenDisabledInProduction()
    {
        await using var factory = HardeningApiFactory.CreateProduction();
        using var client = factory.CreateClient(HardeningApiFactory.ClientOptions());

        using var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { email = "new@example.com", password = "a-password", displayName = "New" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PublicRegistrationEndpoint_RemainsAvailableInDevelopment()
    {
        await using var factory = HardeningApiFactory.CreateDevelopment();
        using var client = factory.CreateClient(HardeningApiFactory.ClientOptions("localhost"));
        using var invalidJson = new StringContent("{", Encoding.UTF8, "application/json");

        using var response = await client.PostAsync("/api/v1/auth/register", invalidJson);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static Task<HttpResponseMessage> PostInvalidLoginAsync(HttpClient client) =>
        client.PostAsJsonAsync("/api/v1/auth/login", new { });

    private static Task<HttpResponseMessage> GetMeAsync(HttpClient client, string token)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me");
        request.Headers.Add("Cookie", $"{AuthCookieNames.AccessToken}={token}");
        return client.SendAsync(request);
    }
}

internal static class HardeningApiFactory
{
    private const string Issuer = "ExamForge.Tests";
    private const string Audience = "ExamForge.Tests.Client";
    private const string Secret =
        "examforge-tests-only-secret-that-is-at-least-64-characters-long-123456789";

    public static WebApplicationFactory<Program> CreateProduction() =>
        Create("Production", HostingSettings.ProductionHost, useInMemoryDatabase: true);

    public static WebApplicationFactory<Program> CreateDevelopment(
        int globalLimit = 120,
        int authenticationLimit = 10,
        int refreshLimit = 30,
        bool useInMemoryDatabase = false) =>
        Create(
            "Development",
            "localhost",
            globalLimit,
            authenticationLimit,
            refreshLimit,
            useInMemoryDatabase);

    public static WebApplicationFactoryClientOptions ClientOptions(
        string host = HostingSettings.ProductionHost) => new()
        {
            BaseAddress = new Uri($"https://{host}"),
            AllowAutoRedirect = false,
            HandleCookies = false
        };

    public static string CreateToken(Guid userId)
    {
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Secret)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: Issuer,
            audience: Audience,
            claims:
            [
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, $"{userId}@example.com"),
                new Claim(ClaimTypes.Role, nameof(UserRole.Student)),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            ],
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static WebApplicationFactory<Program> Create(
        string environment,
        string host,
        int globalLimit = 120,
        int authenticationLimit = 10,
        int refreshLimit = 30,
        bool useInMemoryDatabase = false) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.UseSetting("AllowedHosts", host);
            builder.UseSetting(
                "ConnectionStrings:DefaultConnection",
                "Host=localhost;Port=1;Database=examforge_tests;Username=examforge;Password=examforge;Timeout=1");
            builder.UseSetting("Jwt:Issuer", Issuer);
            builder.UseSetting("Jwt:Audience", Audience);
            builder.UseSetting("Jwt:Secret", Secret);
            builder.UseSetting("Cors:AllowedOrigins:0", "https://study.example.com");
            builder.UseSetting("ForwardedHeaders:KnownProxies:0", "127.0.0.1");
            builder.UseSetting("RateLimiting:Global:TokenLimit", globalLimit.ToString());
            builder.UseSetting("RateLimiting:Global:TokensPerPeriod", globalLimit.ToString());
            builder.UseSetting("RateLimiting:Global:ReplenishmentPeriodSeconds", "3600");
            builder.UseSetting("RateLimiting:Authentication:PermitLimit", authenticationLimit.ToString());
            builder.UseSetting("RateLimiting:Refresh:PermitLimit", refreshLimit.ToString());
            builder.ConfigureLogging(logging => logging.ClearProviders());
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IHostedService>();

                if (useInMemoryDatabase)
                {
                    services.RemoveAll<ExamForgeDbContext>();
                    services.RemoveAll<DbContextOptions<ExamForgeDbContext>>();
                    services.RemoveAll<IDbContextOptionsConfiguration<ExamForgeDbContext>>();
                    services.AddDbContext<ExamForgeDbContext>(options =>
                        options.UseInMemoryDatabase($"hardening-{Guid.NewGuid()}"));
                }
            });
        });
}
