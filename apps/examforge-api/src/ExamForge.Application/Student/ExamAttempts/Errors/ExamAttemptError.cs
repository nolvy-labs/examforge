namespace ExamForge.Application.Student.ExamAttempts.Errors;

public enum ExamAttemptError
{
    None,
    CurrentUserUnavailable,
    ExamNotFound,
    PublishedVersionNotFound,
    AttemptNotFound,
    ActiveAttemptExists,
    AttemptAlreadySubmitted,
    AttemptAlreadyAbandoned,
    InvalidAttemptState,
    RevisionMismatch,
    ConcurrencyConflict,
    InvalidPatch,
    InvalidScoringConfiguration,
    InvalidState,
    InvalidPagination
}

public sealed record ActiveAttemptConflict(Guid ExistingAttemptId);
public sealed record AttemptRevisionConflict(long CurrentRevision);
