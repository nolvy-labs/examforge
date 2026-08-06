namespace ExamForge.Application.Admin.Users.Errors;

public enum AdminUserError
{
    None,
    UserNotFound,
    InvalidUserRole,
    InvalidActiveStatus,
    InvalidSort,
    InvalidPage,
    InvalidPageSize,
    InvalidScoringConfiguration,
    ConcurrencyConflict
}