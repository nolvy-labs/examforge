using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Dtos;

public sealed record CreateExamDetail(
    string Title,
    string? Description,
    ExamType Type
);

public sealed record CreateExamRequest(
    CreateExamDetail ExamDetail,
    IReadOnlyCollection<Guid> TagIds
);

public sealed record UpdateExamDetail(
    string? Title = null,
    string? Description = null,
    ExamType? Type = null
);

public sealed record UpdateExamRequest(
    UpdateExamDetail? ExamDetail = null,
    IReadOnlyCollection<Guid>? AddedTagIds = null,
    IReadOnlyCollection<Guid>? RemovedTagIds = null
)
{
    public IReadOnlyCollection<Guid> AddedTagIds { get; init; } = AddedTagIds ?? [];
    public IReadOnlyCollection<Guid> RemovedTagIds { get; init; } = RemovedTagIds ?? [];
}

public sealed record ExamTagSummaryResponse(
    Guid Id,
    string Name,
    string Slug,
    ExamTagType Type,
    bool IsArchived
);

public sealed record ExamResponse(
    Guid Id,
    string Title,
    string Slug,
    string Description,
    ExamType Type,
    IReadOnlyCollection<ExamTagSummaryResponse> Tags,
    bool IsArchived,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc
);

public sealed record GetExamsRequest(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    IReadOnlyCollection<Guid>? TagIds = null,
    ExamType? Type = null,
    ExamArchiveFilter Archive = ExamArchiveFilter.Active,
    ExamSortOrder Sort = ExamSortOrder.Newest
);