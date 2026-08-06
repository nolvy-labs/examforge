using System.Text.Json;
using System.Text.Json.Serialization;

using ExamForge.Api.Auth;
using ExamForge.Api.Background;
using ExamForge.Api.Common;
using ExamForge.Api.Common.Logging;
using ExamForge.Api.Extensions;
using ExamForge.Api.Filters;
using ExamForge.Api.Middleware;
using ExamForge.Application;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Infrastructure;

using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.Extensions.Logging.Console;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options =>
{
    options.IncludeScopes = true;
    options.TimestampFormat = "yyyy-MM-dd'T'HH:mm:ss.fff'Z'";
    options.UseUtcTimestamp = true;
    options.JsonWriterOptions = new JsonWriterOptions
    {
        Indented = false
    };
});
builder.Services.Configure<ConsoleLoggerOptions>(options =>
    options.LogToStandardErrorThreshold = LogLevel.Error);

builder.Services.AddControllers(options =>
{
    options.Conventions.Add(new RouteTokenTransformerConvention(new SlugifyParameterTransformer()));
    options.Filters.Add<ProblemDetailsMetadataFilter>();
}).AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(
        new JsonStringEnumConverter<ExamAttemptMode>(
            JsonNamingPolicy.CamelCase,
            allowIntegerValues: false)));
builder.Services.AddRouting(options => options.LowercaseUrls = true);
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails(options =>
    options.CustomizeProblemDetails = context =>
        ProblemDetailsRequestMetadata.AddTo(context.ProblemDetails, context.HttpContext));
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ExamForge.Application.Abstractions.ICurrentUserContext, CurrentUserContext>();
builder.Services.AddRequestLogging(builder.Configuration);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApiAuthentication(builder.Configuration);
builder.Services.AddHostedService<ExamAttemptExpirationWorker>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? [];

        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders("ETag", CorrelationIdContext.HeaderName)
            .AllowCredentials();
    });
});

builder.Services.AddHealthChecks();

var app = builder.Build();

app.UseExceptionHandler();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseMiddleware<ApiExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "ExamForge API v1");
    });
}

app.UseHttpsRedirection();

app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");

app.MapControllers();

var lifecycleLogger = app.Services
    .GetRequiredService<ILoggerFactory>()
    .CreateLogger("ExamForge.Api.Lifecycle");
app.Lifetime.ApplicationStarted.Register(() =>
    lifecycleLogger.LogInformation(LogEvents.ApplicationStarted, "Application started"));
app.Lifetime.ApplicationStopping.Register(() =>
    lifecycleLogger.LogInformation(LogEvents.ApplicationStopping, "Application stopping"));

app.Run();
