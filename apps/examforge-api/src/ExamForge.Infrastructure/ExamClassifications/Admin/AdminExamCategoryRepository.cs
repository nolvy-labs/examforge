using ExamForge.Application.Admin.ExamClassifications.Abstractions;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.ExamClassifications.Admin;

public sealed class AdminExamCategoryRepository : IAdminExamCategoryRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public AdminExamCategoryRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyCollection<ExamCategory>> ListAsync(
        bool? isArchived,
        CancellationToken cancellationToken = default)
    {
        var query = IncludeTags(_dbContext.ExamCategories.AsNoTracking());

        if (isArchived is not null)
        {
            query = query.Where(category => category.IsArchived == isArchived.Value);
        }

        return await query
            .OrderBy(category => category.IsArchived)
            .ThenByDescending(category => category.IsFeatured)
            .ThenBy(category => category.DisplayOrder)
            .ThenBy(category => category.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<ExamCategory?> GetByIdWithTagsAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return IncludeTags(_dbContext.ExamCategories)
            .FirstOrDefaultAsync(category => category.Id == id, cancellationToken);
    }

    public Task<bool> ExistsBySlugAsync(
        string slug,
        Guid? excludedCategoryId = null,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.ExamCategories.AnyAsync(
            category =>
                category.Slug == slug &&
                (excludedCategoryId == null || category.Id != excludedCategoryId.Value),
            cancellationToken);
    }

    public async Task<IReadOnlyCollection<Guid>> GetExistingActiveTagIdsAsync(
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

    public void Add(ExamCategory category)
    {
        _dbContext.ExamCategories.Add(category);
    }

    private static IQueryable<ExamCategory> IncludeTags(IQueryable<ExamCategory> query)
    {
        return query
            .Include(category => category.ExamCategoryTags)
            .ThenInclude(categoryTag => categoryTag.ExamTag);
    }
}
