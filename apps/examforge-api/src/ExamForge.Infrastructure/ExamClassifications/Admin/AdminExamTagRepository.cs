using ExamForge.Application.Admin.ExamClassifications.Abstractions;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.ExamClassifications.Admin;

public sealed class AdminExamTagRepository : IAdminExamTagRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public AdminExamTagRepository(ExamForgeDbContext dbContext)
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
        CancellationToken cancellationToken = default)
    {
        return _dbContext.ExamTags.FirstOrDefaultAsync(
            tag => tag.Id == id,
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

    public void Add(ExamTag tag)
    {
        _dbContext.ExamTags.Add(tag);
    }
}