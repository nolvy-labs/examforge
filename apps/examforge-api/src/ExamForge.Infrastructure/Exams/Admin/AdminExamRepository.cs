using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Exams.Admin;

public sealed class AdminExamRepository : IAdminExamRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public AdminExamRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ExamRepositoryPage> GetPageAsync(
        ExamPageQuery request,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Exams.AsNoTracking().AsQueryable();

        query = request.Archive switch
        {
            ExamArchiveFilter.Active => query.Where(exam => !exam.IsArchived),
            ExamArchiveFilter.Archived => query.Where(exam => exam.IsArchived),
            _ => query
        };

        if (request.Type.HasValue)
        {
            query = query.Where(exam => exam.Type == request.Type.Value);
        }

        if (request.TagIds.Count > 0)
        {
            var tagIds = request.TagIds.Distinct().ToList();
            query = query.Where(exam =>
                exam.ExamTagMappings.Count(mapping => tagIds.Contains(mapping.ExamTagId)) == tagIds.Count);
        }

        if (request.Search is not null)
        {
            var titlePattern = $"%{EscapeLikePattern(request.Search)}%";
            var slugSearch = AdminExamSlugGenerator.NormalizeBase(request.Search, useFallback: false);

            if (slugSearch.Length == 0)
            {
                query = query.Where(exam => EF.Functions.ILike(exam.Title, titlePattern, "\\"));
            }
            else
            {
                var slugPattern = $"%{EscapeLikePattern(slugSearch)}%";
                query = query.Where(exam =>
                    EF.Functions.ILike(exam.Title, titlePattern, "\\") ||
                    EF.Functions.ILike(exam.Slug, slugPattern, "\\"));
            }

            // Leading-wildcard search will need a pg_trgm GIN index at larger scale.
        }

        var totalItems = await query.CountAsync(cancellationToken);
        query = request.Sort == ExamSortOrder.Oldest
            ? query.OrderBy(exam => exam.CreatedAtUtc).ThenBy(exam => exam.Id)
            : query.OrderByDescending(exam => exam.CreatedAtUtc).ThenByDescending(exam => exam.Id);

        var exams = await query
            .Skip(request.Skip)
            .Take(request.Take)
            .Include(exam => exam.ExamTagMappings)
            .ThenInclude(mapping => mapping.Tag)
            .AsSplitQuery()
            .ToListAsync(cancellationToken);

        return new ExamRepositoryPage(exams.Select(ToData).ToList(), totalItems);
    }

    public async Task<ExamData?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var exam = await _dbContext.Exams
            .AsNoTracking()
            .Include(item => item.ExamTagMappings)
            .ThenInclude(mapping => mapping.Tag)
            .AsSplitQuery()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return exam is null ? null : ToData(exam);
    }

    public Task<Exam?> GetTrackedWithTagMappingsAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.Exams
            .Include(exam => exam.ExamTagMappings)
            .FirstOrDefaultAsync(exam => exam.Id == id, cancellationToken);
    }

    public Task<bool> ExistsBySlugAsync(
        string slug,
        Guid? excludedExamId = null,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.Exams.AnyAsync(
            exam => exam.Slug == slug &&
                (!excludedExamId.HasValue || exam.Id != excludedExamId.Value),
            cancellationToken);
    }

    public void Add(Exam exam)
    {
        _dbContext.Exams.Add(exam);
    }

    private static ExamData ToData(Exam exam)
    {
        return new ExamData(
            exam.Id,
            exam.Title,
            exam.Slug,
            exam.Description,
            exam.Type,
            exam.ExamTagMappings
                .Select(mapping => new ExamTagData(
                    mapping.Tag.Id,
                    mapping.Tag.Name,
                    mapping.Tag.Slug,
                    mapping.Tag.Type,
                    mapping.Tag.IsArchived))
                .ToList(),
            exam.IsArchived,
            exam.CreatedAtUtc,
            exam.UpdatedAtUtc);
    }

    private static string EscapeLikePattern(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
    }
}