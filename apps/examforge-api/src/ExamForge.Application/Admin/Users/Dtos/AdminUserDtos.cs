using ExamForge.Domain.Users;

namespace ExamForge.Application.Admin.Users.Dtos;

public sealed record GetAdminUsersRequest(
    string? Search = null,
    string? Role = null,
    string? IsActive = null,
    string? Sort = "created-at-desc",
    int Page = 1,
    int PageSize = 20);

public sealed record AdminUserResponse(
    Guid UserId,
    string Email,
    string? DisplayName,
    UserRole Role,
    bool IsActive,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);

public sealed record AdminAttemptStatusStatistics(
    int InProgress,
    int Submitted,
    int Abandoned);

public sealed record AdminAttemptModeStatistics(
    int Practice,
    int Exam);

public sealed record AdminUserAttemptStatistics(
    int TotalAttempts,
    AdminAttemptStatusStatistics AttemptsByStatus,
    AdminAttemptModeStatistics AttemptsByMode,
    decimal? AverageSubmittedPercentage,
    decimal? BestSubmittedPercentage,
    int TotalAnsweredQuestions,
    DateTimeOffset? LastAttemptAtUtc);

public sealed record AdminUserDetailResponse(
    Guid UserId,
    string Email,
    string? DisplayName,
    UserRole Role,
    bool IsActive,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc,
    AdminUserAttemptStatistics Statistics);