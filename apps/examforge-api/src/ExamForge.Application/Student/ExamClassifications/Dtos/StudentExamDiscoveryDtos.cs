using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Student.ExamClassifications.Dtos;

public sealed record StudentExamFiltersResponse(
    IReadOnlyList<StudentExamFilterGroupResponse> Groups);

public sealed record StudentExamFilterGroupResponse(
    ExamTagType Type,
    IReadOnlyList<StudentExamFilterItemResponse> Items);

public sealed record StudentExamFilterItemResponse(
    Guid Id,
    string Name,
    string Slug,
    int ExamCount);

public sealed record StudentExamCategoryResponse(
    Guid Id,
    string Name,
    string Slug,
    string Description,
    bool IsFeatured,
    int ExamCount,
    IReadOnlyList<StudentExamCategoryTagResponse> Tags);

public sealed record StudentExamCategoryTagResponse(
    Guid Id,
    string Name,
    string Slug,
    ExamTagType Type);