using ExamForge.Api.Configuration;

namespace ExamForge.Api.Extensions;

public static class LoggingExtensions
{
    public static IServiceCollection AddRequestLogging(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddOptions<RequestLoggingOptions>()
            .Bind(configuration.GetSection(RequestLoggingOptions.SectionName))
            .Validate(
                options => options.SlowRequestThresholdMilliseconds is > 0 and <= 300_000,
                $"{RequestLoggingOptions.SectionName}:SlowRequestThresholdMilliseconds must be between 1 and 300000.")
            .ValidateOnStart();

        return services;
    }
}
