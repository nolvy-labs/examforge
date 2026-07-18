using ExamForge.Application.Student.ExamClassifications.Abstractions;
using ExamForge.Application.Student.ExamClassifications.Dtos;
using ExamForge.Application.Student.ExamClassifications.Models;
using ExamForge.Domain.Common;

namespace ExamForge.Application.Student.ExamClassifications.Services;

public sealed class StudentExamCategoryService
{
    private readonly IStudentExamCategoryQuery _examCategories;

    public StudentExamCategoryService(IStudentExamCategoryQuery examCategories)
    {
        _examCategories = examCategories;
    }

    public async Task<IReadOnlyCollection<StudentExamCategoryResponse>> ListActiveAsync(
        CancellationToken cancellationToken = default)
    {
        var categories = await _examCategories.ListActiveAsync(cancellationToken);
        return categories.Select(ToResponse).ToList();
    }

    public async Task<StudentExamCategoryResponse?> GetActiveByIdOrSlugAsync(
        string idOrSlug,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idOrSlug))
        {
            return null;
        }

        var normalizedIdOrSlug = Guid.TryParse(idOrSlug, out _)
            ? idOrSlug
            : TextNormalizer.NormalizeSlug(idOrSlug);

        var category = await _examCategories.GetActiveByIdOrSlugAsync(
            normalizedIdOrSlug,
            cancellationToken);

        return category is null ? null : ToResponse(category);
    }

    private static StudentExamCategoryResponse ToResponse(StudentExamCategoryModel category)
    {
        return new StudentExamCategoryResponse(
            category.Id,
            category.Name,
            category.Slug,
            category.Description,
            category.MatchMode,
            category.IsFeatured,
            IsArchived: false,
            category.DisplayOrder,
            category.CreatedAtUtc,
            category.UpdatedAtUtc,
            category.Tags.Select(tag => new StudentExamCategoryTagResponse(
                    tag.Id,
                    tag.Name,
                    tag.Slug,
                    tag.Type))
                .ToList());
    }
}
