using ExamForge.Application.Student.ExamAttempts.Dtos;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.ExamAttempts.Dtos;

public sealed record GetAdminAttemptsRequest(
    string? Search = null,
    string? Status = null,
    string? Mode = null,
    string? CreatedFrom = null,
    string? CreatedTo = null,
    string? Sort = "created-at-desc",
    int Page = 1,
    int PageSize = 20);

public sealed record AdminAttemptUserSummary(
    Guid UserId,
    string? DisplayName,
    string Email);

public sealed record AdminAttemptExamSummary(
    Guid ExamId,
    string Title,
    string Slug);

public sealed record AdminAttemptVersionSummary(
    Guid ExamVersionId,
    int VersionNumber,
    string Title);

public sealed record AdminAttemptDetailExam(
    Guid ExamId,
    string Title,
    string Slug,
    string Description,
    ExamType Type);

public sealed record AdminAttemptDetailVersion(
    Guid ExamVersionId,
    int VersionNumber,
    string Title,
    string Description,
    string Instructions,
    int? DurationMinutes);

public sealed record AdminAttemptScoreSummary(
    decimal? Score,
    decimal? MaximumScore,
    decimal? Percentage);

public sealed record AdminAttemptSummaryResponse(
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
    AdminAttemptUserSummary User,
    AdminAttemptExamSummary Exam,
    AdminAttemptVersionSummary ExamVersion,
    AdminAttemptScoreSummary Score);

public sealed record AdminAttemptDetailResponse(
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
    AdminAttemptUserSummary User,
    AdminAttemptDetailExam Exam,
    AdminAttemptDetailVersion ExamVersion,
    AdminAttemptScoreSummary Score,
    IReadOnlyList<ExamAttemptSectionResponse> Sections);