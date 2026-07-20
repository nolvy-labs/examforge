using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Dtos;

public sealed record GetExamVersionsRequest(
    int Page = 1,
    int PageSize = 20,
    ExamVersionStatus? Status = null,
    ExamSortOrder Sort = ExamSortOrder.Newest);

public sealed record CreateExamVersionDetail(
    string? Title = null,
    string? Description = null,
    string? Instructions = null,
    int? DurationMinutes = null);

public sealed record CreateExamVersionRequest(
    Guid? SourceVersionId = null,
    CreateExamVersionDetail? Detail = null,
    IReadOnlyList<CreateExamSectionInput>? Sections = null);

public sealed record ExamVersionSummaryResponse(
    Guid Id,
    Guid ExamId,
    int VersionNumber,
    ExamVersionStatus Status,
    string Title,
    int? DurationMinutes,
    decimal TotalScore,
    Guid? CreatedByUserId,
    DateTimeOffset? PublishedAtUtc,
    DateTimeOffset? RetiredAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);

public sealed record ExamVersionDetailResponse(
    Guid Id,
    Guid ExamId,
    int VersionNumber,
    ExamVersionStatus Status,
    string Title,
    string Description,
    string Instructions,
    int? DurationMinutes,
    decimal TotalScore,
    Guid? CreatedByUserId,
    DateTimeOffset? PublishedAtUtc,
    DateTimeOffset? RetiredAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc,
    IReadOnlyList<ExamSectionDetailResponse>? Sections = null);