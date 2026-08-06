namespace ExamForge.Application.Student.ExamAttempts.Errors;

public enum ExamAttemptError
{
    None,
    CurrentUserUnavailable,
    ExamNotFound,
    PublishedVersionNotFound,
    AttemptNotFound,
    ActiveAttemptExists,
    ExamModeRequiresTimeLimit,
    AttemptAlreadySubmitted,
    AttemptAlreadyAbandoned,
    InvalidAttemptState,
    RevisionMismatch,
    ConcurrencyConflict,
    InvalidPatch,
    InvalidScoringConfiguration,
    InvalidAttemptStatus,
    InvalidAttemptMode,
    InvalidAttemptSort,
    InvalidPage,
    InvalidPageSize
}

public sealed record ActiveAttemptConflict(Guid ExistingAttemptId);
public sealed record AttemptRevisionConflict(long CurrentRevision);