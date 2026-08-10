using System.Text.Json;

using ExamForge.Api.Configuration;
using ExamForge.Api.Health;

using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ExamForge.Api.Extensions;

public static class HealthCheckExtensions
{
    private const string ReadyTag = "ready";

    public static IServiceCollection AddApiHealthChecks(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddOptions<ApiHealthCheckSettings>()
            .Bind(configuration.GetSection(ApiHealthCheckSettings.SectionName))
            .Validate(
                ProductionConfigurationValidation.HasValidHealthChecks,
                "HealthChecks:ReadinessTimeoutSeconds must be between 1 and 30.")
            .ValidateOnStart();

        services
            .AddHealthChecks()
            .AddCheck<DatabaseReadinessHealthCheck>(
                "postgresql",
                failureStatus: HealthStatus.Unhealthy,
                tags: [ReadyTag]);

        return services;
    }

    public static WebApplication MapApiHealthChecks(this WebApplication app)
    {
        app.MapHealthChecks("/health/live", new HealthCheckOptions
        {
            Predicate = _ => false,
            ResponseWriter = WriteSafeResponseAsync
        }).DisableRateLimiting();

        app.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = registration => registration.Tags.Contains(ReadyTag),
            ResponseWriter = WriteSafeResponseAsync
        }).DisableRateLimiting();

        return app;
    }

    private static Task WriteSafeResponseAsync(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";
        return JsonSerializer.SerializeAsync(
            context.Response.Body,
            new { status = report.Status.ToString() },
            cancellationToken: context.RequestAborted);
    }
}
