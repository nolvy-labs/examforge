using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Users;

namespace ExamForge.Application.Admin.Users.Models;

public enum AdminCreatedAtSort
{
    Descending,
    Ascending
}

public sealed record AdminUserPageQuery(
    string? Search,
    UserRole? Role,
    bool? IsActive,
    AdminCreatedAtSort Sort,
    int Skip,
    int Take);

public sealed record AdminUserModel(
    Guid UserId,
    string Email,
    string? DisplayName,
    UserRole Role,
    bool IsActive,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);

public sealed record AdminUserPageModel(
    IReadOnlyList<AdminUserModel> Items,
    int TotalItems);

public sealed record AdminUserStatisticsModel(
    int TotalAttempts,
    int InProgressAttempts,
    int SubmittedAttempts,
    int AbandonedAttempts,
    int PracticeAttempts,
    int ExamAttempts,
    decimal? AverageSubmittedPercentage,
    decimal? BestSubmittedPercentage,
    int TotalAnsweredQuestions,
    DateTimeOffset? LastAttemptAtUtc);