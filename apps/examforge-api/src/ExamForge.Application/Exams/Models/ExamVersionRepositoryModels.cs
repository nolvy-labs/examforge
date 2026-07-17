using ExamForge.Domain.Exams;

namespace ExamForge.Application.Exams;

public sealed record ExamVersionData(
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
    DateTimeOffset? UpdatedAtUtc);

public sealed record ExamVersionRepositoryPage(
    IReadOnlyList<ExamVersionData> Items,
    int TotalItems);

public sealed record ExamVersionPageQuery(
    int Skip,
    int Take,
    ExamVersionStatus? Status,
    ExamSortOrder Sort);