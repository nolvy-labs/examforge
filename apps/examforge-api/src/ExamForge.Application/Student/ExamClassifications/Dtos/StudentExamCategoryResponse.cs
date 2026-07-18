using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Student.ExamClassifications.Dtos;

public sealed record StudentExamCategoryResponse(
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
    IReadOnlyCollection<StudentExamCategoryTagResponse> Tags);

public sealed record StudentExamCategoryTagResponse(
    Guid Id,
    string Name,
    string Slug,
    ExamTagType Type);
