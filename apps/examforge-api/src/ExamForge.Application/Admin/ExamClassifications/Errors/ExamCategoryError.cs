namespace ExamForge.Application.Admin.ExamClassifications.Errors;

public enum ExamCategoryError
{
    None = 0,
    NotFound = 1,
    InvalidName = 2,
    InvalidMatchMode = 3,
    SlugAlreadyExists = 4,
    DuplicateTagIds = 5,
    MissingOrArchivedTagIds = 6,
    InvalidSlug = 7,
    InvalidDescription = 8
}