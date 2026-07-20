namespace ExamForge.Application.Admin.Exams.Errors;

public enum ExamVersionError
{
    None = 0,
    ExamNotFound = 1,
    VersionNotFound = 2,
    PublishedVersionNotFound = 3,
    InvalidRequest = 4,
    InvalidPagination = 5,
    InvalidTitle = 6,
    InvalidDescription = 7,
    InvalidInstructions = 8,
    InvalidDuration = 9,
    InvalidStatus = 10,
    ExamArchived = 11,
    VersionNotEditable = 12,
    InvalidStatusTransition = 13,
    VersionNotReadyForPublication = 14,
    VersionCannotBeDeleted = 15,
    SourceVersionNotFound = 16,
    VersionNumberExhausted = 18,
    ConcurrencyConflict = 19,
    CurrentUserUnavailable = 20,
    InvalidNestedContent = 21,
    InvalidPatch = 22
}