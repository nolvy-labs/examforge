namespace ExamForge.Application.ExamTags;

public enum ExamTagError
{
    None = 0,
    NotFound = 1,
    SlugAlreadyExists = 2,
    InvalidName = 3,
    InvalidSlug = 4,
    InvalidDescription = 5,
    InvalidType = 6
}
