using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Student.ExamClassifications.Models;

public sealed record StudentExamFilterTagModel(
    Guid Id,
    string Name,
    string Slug,
    ExamTagType Type,
    int ExamCount);

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
    bool IsFeatured,
    int ExamCount,
    IReadOnlyList<StudentExamCategoryTagModel> Tags);

public sealed record StudentExamCategoryRuleModel(
    ExamCategoryMatchMode MatchMode,
    IReadOnlyList<Guid> TagIds);