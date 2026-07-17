using ExamForge.Domain.ExamClassifications;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Exams;

public sealed record ExamTagData(
    Guid Id,
    string Name,
    string Slug,
    ExamTagType Type,
    bool IsArchived
);

public sealed record ExamData(
    Guid Id,
    string Title,
    string Slug,
    string Description,
    ExamType Type,
    IReadOnlyCollection<ExamTagData> Tags,
    bool IsArchived,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc
);

public sealed record ExamRepositoryPage(
    IReadOnlyList<ExamData> Items,
    int TotalItems
);

public sealed record ExamPageQuery(
    int Skip,
    int Take,
    string? Search,
    IReadOnlyCollection<Guid> TagIds,
    ExamType? Type,
    ExamArchiveFilter Archive,
    ExamSortOrder Sort
);