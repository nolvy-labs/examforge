using ExamForge.Application.Admin.Users.Models;
using ExamForge.Domain.ExamAttempts;

namespace ExamForge.Application.Admin.ExamAttempts.Models;

public enum AdminAttemptScope
{
    Exam,
    User
}

public sealed record AdminAttemptPageQuery(
    AdminAttemptScope Scope,
    Guid ScopeId,
    string? Search,
    ExamAttemptStatus? Status,
    ExamAttemptMode? Mode,
    DateTimeOffset? CreatedFromUtc,
    DateTimeOffset? CreatedToUtc,
    AdminCreatedAtSort Sort,
    int Skip,
    int Take);

public sealed record AdminAttemptListModel(
    Guid AttemptId,
    ExamAttemptStatus Status,
    ExamAttemptMode Mode,
    long Revision,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset? ExpiresAtUtc,
    DateTimeOffset? SubmittedAtUtc,
    DateTimeOffset? AbandonedAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    Guid UserId,
    string? UserDisplayName,
    string UserEmail,
    Guid ExamId,
    string ExamTitle,
    string ExamSlug,
    Guid ExamVersionId,
    int ExamVersionNumber,
    string ExamVersionTitle,
    decimal? Score,
    decimal? MaximumScore);

public sealed record AdminAttemptPageModel(
    IReadOnlyList<AdminAttemptListModel> Items,
    int TotalItems);