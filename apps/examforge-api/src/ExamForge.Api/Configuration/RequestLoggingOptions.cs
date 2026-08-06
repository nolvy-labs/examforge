namespace ExamForge.Api.Configuration;

public sealed class RequestLoggingOptions
{
    public const string SectionName = "Logging:RequestLogging";

    public int SlowRequestThresholdMilliseconds { get; set; } = 1000;
}
