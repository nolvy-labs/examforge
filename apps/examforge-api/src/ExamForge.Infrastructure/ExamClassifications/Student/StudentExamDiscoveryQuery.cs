using ExamForge.Application.Student.ExamClassifications.Abstractions;
using ExamForge.Application.Student.ExamClassifications.Models;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Infrastructure.Exams.Student;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.ExamClassifications.Student;

public sealed class StudentExamDiscoveryQuery : IStudentExamDiscoveryQuery
{
    private readonly ExamForgeDbContext _dbContext;

    public StudentExamDiscoveryQuery(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<StudentExamFilterTagModel>> GetFilterTagsAsync(
        CancellationToken cancellationToken = default) =>
        await FilterTags()
            .ToListAsync(cancellationToken);

    private IQueryable<StudentExamFilterTagModel> FilterTags()
    {
        var visibleExamIds = _dbContext.Exams
            .AsNoTracking()
            .StudentVisible()
            .Select(exam => exam.Id);

        return _dbContext.ExamTagMappings
            .AsNoTracking()
            .Where(mapping =>
                !mapping.Tag.IsArchived &&
                visibleExamIds.Contains(mapping.ExamId))
            .GroupBy(mapping => new
            {
                mapping.Tag.Id,
                mapping.Tag.Name,
                mapping.Tag.Slug,
                mapping.Tag.Type
            })
            .OrderBy(group => group.Key.Type)
            .ThenBy(group => group.Key.Name)
            .ThenBy(group => group.Key.Slug)
            .ThenBy(group => group.Key.Id)
            .Select(group => new StudentExamFilterTagModel(
                group.Key.Id,
                group.Key.Name,
                group.Key.Slug,
                group.Key.Type,
                group.Select(mapping => mapping.ExamId).Distinct().Count()));
    }

    public async Task<IReadOnlyList<StudentExamCategoryModel>> GetCategoriesAsync(
        bool featuredOnly,
        CancellationToken cancellationToken = default)
    {
        var categories = await CategoryCores(featuredOnly)
            .ToListAsync(cancellationToken);
        var counts = await GetCategoryExamCountsAsync(
            categories.Select(category => category.Id).ToList(),
            cancellationToken);
        return await AddTagsAsync(categories, counts, cancellationToken);
    }

    public async Task<StudentExamCategoryModel?> GetCategoryBySlugAsync(
        string slug,
        CancellationToken cancellationToken = default)
    {
        var category = await _dbContext.ValidCategoryRules()
            .Where(item => item.Slug == slug)
            .Select(item => new StudentExamCategoryCore(
                item.Id,
                item.Name,
                item.Slug,
                item.Description,
                item.IsFeatured,
                item.DisplayOrder))
            .SingleOrDefaultAsync(cancellationToken);
        if (category is null)
        {
            return null;
        }

        var counts = await GetCategoryExamCountsAsync(
            [category.Id],
            cancellationToken);

        return (await AddTagsAsync(
            [category],
            counts,
            cancellationToken)).Single();
    }

    public async Task<StudentExamCategoryRuleModel?> GetCategoryRuleBySlugAsync(
        string slug,
        CancellationToken cancellationToken = default)
    {
        var category = await _dbContext.ValidCategoryRules()
            .Where(item => item.Slug == slug)
            .Select(item => new
            {
                item.Id,
                item.MatchMode
            })
            .SingleOrDefaultAsync(cancellationToken);
        if (category is null)
        {
            return null;
        }

        var tagIds = await _dbContext.ExamCategoryTags
            .AsNoTracking()
            .Where(categoryTag => categoryTag.ExamCategoryId == category.Id)
            .Select(categoryTag => categoryTag.ExamTagId)
            .Distinct()
            .OrderBy(id => id)
            .ToListAsync(cancellationToken);
        return new StudentExamCategoryRuleModel(category.MatchMode, tagIds);
    }

    public async Task<IReadOnlyCollection<Guid>> GetActiveTagIdsAsync(
        IReadOnlyCollection<Guid> tagIds,
        CancellationToken cancellationToken = default)
    {
        if (tagIds.Count == 0)
        {
            return [];
        }

        return await _dbContext.ExamTags
            .AsNoTracking()
            .Where(tag => tagIds.Contains(tag.Id) && !tag.IsArchived)
            .Select(tag => tag.Id)
            .ToListAsync(cancellationToken);
    }

    private IQueryable<StudentExamCategoryCore> CategoryCores(bool featuredOnly)
    {
        var categories = _dbContext.ValidCategoryRules();
        if (featuredOnly)
        {
            categories = categories.Where(category => category.IsFeatured);
        }

        return categories
            .OrderByDescending(category => category.IsFeatured)
            .ThenBy(category => category.DisplayOrder)
            .ThenBy(category => category.Name)
            .ThenBy(category => category.Id)
            .Select(category => new StudentExamCategoryCore(
                category.Id,
                category.Name,
                category.Slug,
                category.Description,
                category.IsFeatured,
                category.DisplayOrder));
    }

    private async Task<IReadOnlyDictionary<Guid, int>> GetCategoryExamCountsAsync(
        IReadOnlyCollection<Guid> categoryIds,
        CancellationToken cancellationToken)
    {
        if (categoryIds.Count == 0)
        {
            return new Dictionary<Guid, int>();
        }

        var counts = await CategoryExamCounts(categoryIds)
            .ToListAsync(cancellationToken);
        return counts.ToDictionary(item => item.CategoryId, item => item.ExamCount);
    }

    private IQueryable<StudentExamCategoryCount> CategoryExamCounts(
        IReadOnlyCollection<Guid> categoryIds)
    {
        var categories = _dbContext.ValidCategoryRules()
            .Where(category => categoryIds.Contains(category.Id));
        var exams = _dbContext.Exams
            .AsNoTracking()
            .StudentVisible();
        var matchedPairs =
            from category in categories
            from exam in exams
            let configuredTagCount = category.ExamCategoryTags
                .Select(categoryTag => categoryTag.ExamTagId)
                .Distinct()
                .Count()
            let matchedTagCount = exam.ExamTagMappings
                .Where(mapping => category.ExamCategoryTags
                    .Select(categoryTag => categoryTag.ExamTagId)
                    .Contains(mapping.ExamTagId))
                .Select(mapping => mapping.ExamTagId)
                .Distinct()
                .Count()
            where
                (category.MatchMode == ExamCategoryMatchMode.All &&
                 matchedTagCount == configuredTagCount) ||
                (category.MatchMode == ExamCategoryMatchMode.Any &&
                 matchedTagCount > 0)
            select new
            {
                CategoryId = category.Id,
                ExamId = exam.Id
            };

        return matchedPairs
            .GroupBy(pair => pair.CategoryId)
            .Select(group => new StudentExamCategoryCount(
                group.Key,
                group.Select(pair => pair.ExamId).Distinct().Count()));
    }

    private async Task<IReadOnlyList<StudentExamCategoryModel>> AddTagsAsync(
        IReadOnlyList<StudentExamCategoryCore> categories,
        IReadOnlyDictionary<Guid, int> counts,
        CancellationToken cancellationToken)
    {
        if (categories.Count == 0)
        {
            return [];
        }

        var categoryIds = categories.Select(category => category.Id).ToList();
        var rows = await _dbContext.ExamCategoryTags
            .AsNoTracking()
            .Where(categoryTag => categoryIds.Contains(categoryTag.ExamCategoryId))
            .OrderBy(categoryTag => categoryTag.ExamTag.Type)
            .ThenBy(categoryTag => categoryTag.ExamTag.Name)
            .ThenBy(categoryTag => categoryTag.ExamTag.Id)
            .Select(categoryTag => new StudentExamCategoryTagRow(
                categoryTag.ExamCategoryId,
                new StudentExamCategoryTagModel(
                    categoryTag.ExamTag.Id,
                    categoryTag.ExamTag.Name,
                    categoryTag.ExamTag.Slug,
                    categoryTag.ExamTag.Type)))
            .ToListAsync(cancellationToken);
        var tagsByCategory = rows
            .GroupBy(row => row.CategoryId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<StudentExamCategoryTagModel>)group
                    .Select(row => row.Tag)
                    .ToList());
        return categories.Select(category => new StudentExamCategoryModel(
                category.Id,
                category.Name,
                category.Slug,
                category.Description,
                category.IsFeatured,
                counts.GetValueOrDefault(category.Id),
                tagsByCategory.GetValueOrDefault(category.Id, [])))
            .ToList();
    }

    private sealed record StudentExamCategoryCore(
        Guid Id,
        string Name,
        string Slug,
        string Description,
        bool IsFeatured,
        int DisplayOrder);

    private sealed record StudentExamCategoryCount(
        Guid CategoryId,
        int ExamCount);

    private sealed record StudentExamCategoryTagRow(
        Guid CategoryId,
        StudentExamCategoryTagModel Tag);
}