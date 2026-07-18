namespace ExamForge.Application.Admin.Exams.Errors;

public enum ExamError
{
    None = 0,
    NotFound = 1,
    InvalidRequest = 2,
    InvalidTitle = 3,
    InvalidDescription = 4,
    InvalidType = 5,
    InvalidPagination = 6,
    DuplicateTagIds = 7,
    OverlappingTagChanges = 8,
    MissingOrArchivedTagIds = 9,
    TooManyTags = 10,
    UnableToGenerateUniqueSlug = 11,
    InvalidNestedContent = 12,
    CurrentUserUnavailable = 13,
    ConcurrencyConflict = 14
}