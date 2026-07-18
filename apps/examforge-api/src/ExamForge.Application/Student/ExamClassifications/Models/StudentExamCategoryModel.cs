using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Student.ExamClassifications.Models;

public sealed record StudentExamCategoryTagModel(
    Guid Id,
    string Name,
    string Slug,
    ExamTagType Type);

public sealed record StudentExamCategoryModel(
    Guid Id,
    string Name,
    string Slug,
    string Description,
    ExamCategoryMatchMode MatchMode,
    bool IsFeatured,
    int DisplayOrder,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc,
    IReadOnlyCollection<StudentExamCategoryTagModel> Tags);
