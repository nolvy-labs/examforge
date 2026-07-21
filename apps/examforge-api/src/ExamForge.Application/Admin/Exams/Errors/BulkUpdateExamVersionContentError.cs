namespace ExamForge.Application.Admin.Exams.Errors;

public enum BulkUpdateExamVersionContentError
{
    None = 0,
    InvalidRequest = 1,
    InvalidPatch = 2,
    ExamNotFound = 3,
    VersionNotFound = 4,
    ExamArchived = 5,
    VersionNotEditable = 6,
    TargetNotFound = 7,
    PreconditionFailed = 8,
    IncompatibleContent = 9,
    DuplicateAnswer = 10,
    AmbiguousCorrectOptions = 11,
    ContentRevisionExhausted = 12,
    ConcurrencyConflict = 13
}