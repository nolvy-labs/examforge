using ExamForge.Application.Common;
using ExamForge.Application.Student.ExamClassifications.Abstractions;
using ExamForge.Application.Student.ExamClassifications.Dtos;
using ExamForge.Application.Student.ExamClassifications.Errors;
using ExamForge.Application.Student.ExamClassifications.Models;
using ExamForge.Domain.Common;

namespace ExamForge.Application.Student.ExamClassifications.Services;

public sealed class StudentExamDiscoveryService
{
    private readonly IStudentExamDiscoveryQuery _query;

    public StudentExamDiscoveryService(IStudentExamDiscoveryQuery query)
    {
        _query = query;
    }

    public async Task<StudentExamFiltersResponse> GetFiltersAsync(
        CancellationToken cancellationToken = default)
    {
        var tags = await _query.GetFilterTagsAsync(cancellationToken);
        return new StudentExamFiltersResponse(
            tags.GroupBy(tag => tag.Type)
                .OrderBy(group => group.Key)
                .Select(group => new StudentExamFilterGroupResponse(
                    group.Key,
                    group.OrderBy(tag => tag.Name)
                        .ThenBy(tag => tag.Slug)
                        .ThenBy(tag => tag.Id)
                        .Select(tag => new StudentExamFilterItemResponse(
                            tag.Id,
                            tag.Name,
                            tag.Slug,
                            tag.ExamCount))
                        .ToList()))
                .ToList());
    }

    public async Task<IReadOnlyList<StudentExamCategoryResponse>> GetCategoriesAsync(
        bool featuredOnly,
        CancellationToken cancellationToken = default)
    {
        var categories = await _query.GetCategoriesAsync(
            featuredOnly,
            cancellationToken);
        return categories.Select(ToResponse).ToList();
    }

    public async Task<Result<StudentExamCategoryResponse, StudentExamDiscoveryError>>
        GetCategoryAsync(
            string slug,
            CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return Result<StudentExamCategoryResponse, StudentExamDiscoveryError>.Failure(
                StudentExamDiscoveryError.CategoryNotFound);
        }

        var category = await _query.GetCategoryBySlugAsync(
            TextNormalizer.NormalizeSlug(slug),
            cancellationToken);
        return category is null
            ? Result<StudentExamCategoryResponse, StudentExamDiscoveryError>.Failure(
                StudentExamDiscoveryError.CategoryNotFound)
            : Result<StudentExamCategoryResponse, StudentExamDiscoveryError>.Success(
                ToResponse(category));
    }

    private static StudentExamCategoryResponse ToResponse(
        StudentExamCategoryModel category) =>
        new(
            category.Id,
            category.Name,
            category.Slug,
            category.Description,
            category.IsFeatured,
            category.ExamCount,
            category.Tags.Select(tag => new StudentExamCategoryTagResponse(
                    tag.Id,
                    tag.Name,
                    tag.Slug,
                    tag.Type))
                .ToList());
}