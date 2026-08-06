namespace ExamForge.Application.Admin.ExamAttempts.Errors;

public enum AdminAttemptError
{
    None,
    UserNotFound,
    ExamNotFound,
    AttemptNotFound,
    InvalidAttemptStatus,
    InvalidAttemptMode,
    InvalidCreatedFrom,
    InvalidCreatedTo,
    InvalidCreatedDateRange,
    InvalidSort,
    InvalidPage,
    InvalidPageSize,
    InvalidScoringConfiguration,
    ConcurrencyConflict
}