using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Admin.ExamClassifications.Dtos;

public sealed record ExamCategoryResponse(
    Guid Id,
    string Name,
    string Slug,
    string Description,
    ExamCategoryMatchMode MatchMode,
    bool IsFeatured,
    bool IsArchived,
    int DisplayOrder,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc,
    IReadOnlyCollection<ExamCategoryTagResponse> Tags
);

public sealed record ExamCategoryTagResponse(
    Guid Id,
    string Name,
    string Slug,
    ExamTagType Type
);

public sealed record CreateExamCategoryRequest(
    string Name,
    string? Slug,
    string Description,
    ExamCategoryMatchMode MatchMode,
    bool IsFeatured,
    int DisplayOrder,
    IReadOnlyCollection<Guid>? ExamTagIds
);

public sealed record UpdateExamCategoryRequest(
    string? Name,
    string? Slug,
    string? Description,
    ExamCategoryMatchMode? MatchMode,
    bool? IsFeatured,
    int? DisplayOrder,
    IReadOnlyCollection<Guid>? ExamTagIds
);