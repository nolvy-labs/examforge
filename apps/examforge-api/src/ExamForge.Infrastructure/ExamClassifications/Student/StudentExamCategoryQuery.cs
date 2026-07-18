using ExamForge.Application.Student.ExamClassifications.Abstractions;
using ExamForge.Application.Student.ExamClassifications.Models;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.ExamClassifications.Student;

public sealed class StudentExamCategoryQuery : IStudentExamCategoryQuery
{
    private readonly ExamForgeDbContext _dbContext;

    public StudentExamCategoryQuery(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyCollection<StudentExamCategoryModel>> ListActiveAsync(
        CancellationToken cancellationToken = default)
    {
        return await ActiveCategories()
            .OrderByDescending(category => category.IsFeatured)
            .ThenBy(category => category.DisplayOrder)
            .ThenBy(category => category.Name)
            .Select(ToModel())
            .ToListAsync(cancellationToken);
    }

    public Task<StudentExamCategoryModel?> GetActiveByIdOrSlugAsync(
        string idOrSlug,
        CancellationToken cancellationToken = default)
    {
        var query = ActiveCategories();

        query = Guid.TryParse(idOrSlug, out var id)
            ? query.Where(category => category.Id == id)
            : query.Where(category => category.Slug == idOrSlug);

        return query
            .Select(ToModel())
            .FirstOrDefaultAsync(cancellationToken);
    }

    private IQueryable<ExamCategory> ActiveCategories()
    {
        return _dbContext.ExamCategories
            .AsNoTracking()
            .Where(category => !category.IsArchived);
    }

    private static System.Linq.Expressions.Expression<Func<ExamCategory, StudentExamCategoryModel>> ToModel()
    {
        return category => new StudentExamCategoryModel(
            category.Id,
            category.Name,
            category.Slug,
            category.Description,
            category.MatchMode,
            category.IsFeatured,
            category.DisplayOrder,
            category.CreatedAtUtc,
            category.UpdatedAtUtc,
            category.ExamCategoryTags
                .Where(categoryTag => !categoryTag.ExamTag.IsArchived)
                .OrderBy(categoryTag => categoryTag.ExamTag.Type)
                .ThenBy(categoryTag => categoryTag.ExamTag.Name)
                .Select(categoryTag => new StudentExamCategoryTagModel(
                    categoryTag.ExamTag.Id,
                    categoryTag.ExamTag.Name,
                    categoryTag.ExamTag.Slug,
                    categoryTag.ExamTag.Type))
                .ToList());
    }
}
