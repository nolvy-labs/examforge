namespace ExamForge.Api.Common.Logging;

public static class LogEvents
{
    public static readonly EventId RequestCompleted = new(1000, nameof(RequestCompleted));
    public static readonly EventId SlowRequest = new(1001, nameof(SlowRequest));
    public static readonly EventId UnexpectedException = new(1002, nameof(UnexpectedException));
    public static readonly EventId ApplicationStarted = new(1003, nameof(ApplicationStarted));
    public static readonly EventId ApplicationStopping = new(1004, nameof(ApplicationStopping));
    public static readonly EventId ExamAttemptsExpired = new(2000, nameof(ExamAttemptsExpired));
    public static readonly EventId ExamAttemptExpirationFailed = new(2001, nameof(ExamAttemptExpirationFailed));
    public static readonly EventId ExamAttemptExpirationBatchFailed = new(2002, nameof(ExamAttemptExpirationBatchFailed));
}
