using ExamForge.Application.Abstractions.ExamClassification;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.ExamClassifications;

public sealed class ExamTagRepository : IExamTagRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public ExamTagRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ExamTag>> ListAsync(
        ExamTagType? type,
        bool includeArchived,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ExamTags.AsQueryable();

        if (type.HasValue)
        {
            query = query.Where(tag => tag.Type == type.Value);
        }

        if (!includeArchived)
        {
            query = query.Where(tag => !tag.IsArchived);
        }

        return await query
            .AsNoTracking()
            .OrderBy(tag => tag.Type)
            .ThenBy(tag => tag.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<ExamTag?> GetByIdAsync(
        Guid id,
        bool includeArchived,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ExamTags.AsQueryable();

        if (!includeArchived)
        {
            query = query.Where(tag => !tag.IsArchived);
        }

        return query.FirstOrDefaultAsync(tag => tag.Id == id, cancellationToken);
    }

    public Task<ExamTag?> GetByTypeAndSlugAsync(
        ExamTagType type,
        string slug,
        bool includeArchived,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ExamTags.AsQueryable();

        if (!includeArchived)
        {
            query = query.Where(tag => !tag.IsArchived);
        }

        return query.FirstOrDefaultAsync(
            tag => tag.Type == type && tag.Slug == slug,
            cancellationToken);
    }

    public Task<bool> ExistsByTypeAndSlugAsync(
        ExamTagType type,
        string slug,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ExamTags
            .Where(tag => tag.Type == type && tag.Slug == slug);

        if (excludeId.HasValue)
        {
            query = query.Where(tag => tag.Id != excludeId.Value);
        }

        return query.AnyAsync(cancellationToken);
    }

    public void Add(ExamTag tag)
    {
        _dbContext.ExamTags.Add(tag);
    }
}