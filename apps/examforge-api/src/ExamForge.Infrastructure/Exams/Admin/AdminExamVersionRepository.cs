using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Application.Admin.Exams.Services;
using ExamForge.Application.Admin.Exams.Utils;
using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Exams.Admin;

public sealed class AdminExamVersionRepository : IAdminExamVersionRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public AdminExamVersionRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ExamVersionRepositoryPage> GetPageAsync(
        Guid examId,
        ExamVersionPageQuery request,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ExamVersions
            .AsNoTracking()
            .Where(version => version.ExamId == examId);

        if (request.Status.HasValue)
        {
            query = query.Where(version => version.Status == request.Status.Value);
        }

        var totalItems = await query.CountAsync(cancellationToken);
        query = request.Sort == ExamSortOrder.Oldest
            ? query.OrderBy(version => version.CreatedAtUtc).ThenBy(version => version.Id)
            : query.OrderByDescending(version => version.CreatedAtUtc).ThenByDescending(version => version.Id);

        var items = await Project(query)
            .Skip(request.Skip)
            .Take(request.Take)
            .ToListAsync(cancellationToken);

        return new ExamVersionRepositoryPage(items, totalItems);
    }

    public Task<ExamVersionData?> GetDetailAsync(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ExamVersions
            .AsNoTracking()
            .Where(version => version.ExamId == examId && version.Id == versionId);

        return Project(query).FirstOrDefaultAsync(cancellationToken);
    }

    public Task<ExamVersion?> GetTrackedAsync(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.ExamVersions.FirstOrDefaultAsync(
            version => version.ExamId == examId && version.Id == versionId,
            cancellationToken);
    }

    public Task<ExamVersion?> GetTrackedCurrentPublishedAsync(
        Guid examId,
        Guid excludedVersionId,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.ExamVersions.FirstOrDefaultAsync(
            version => version.ExamId == examId &&
                version.Id != excludedVersionId &&
                version.Status == ExamVersionStatus.Published,
            cancellationToken);
    }

    public Task<ExamVersionData?> GetSourceForCloneAsync(
        Guid examId,
        Guid sourceVersionId,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ExamVersions
            .AsNoTracking()
            .Where(version => version.ExamId == examId &&
                version.Id == sourceVersionId);

        return Project(query).FirstOrDefaultAsync(cancellationToken);
    }

    public Task<Exam?> GetExamForUpdateAsync(
        Guid examId,
        CancellationToken cancellationToken = default)
    {
        if (_dbContext.Database.CurrentTransaction is null)
        {
            throw new InvalidOperationException(
                "The parent exam row can only be locked inside an active transaction.");
        }

        return _dbContext.Exams
            .FromSqlInterpolated($$"""
                SELECT *
                FROM examforge.exams
                WHERE "Id" = {{examId}}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync(cancellationToken);
    }

    public Task<bool> ExamExistsAsync(
        Guid examId,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.Exams
            .AsNoTracking()
            .AnyAsync(exam => exam.Id == examId, cancellationToken);
    }

    public void Add(ExamVersion version)
    {
        _dbContext.ExamVersions.Add(version);
    }

    public void Remove(ExamVersion version)
    {
        _dbContext.ExamVersions.Remove(version);
    }

    private static IQueryable<ExamVersionData> Project(IQueryable<ExamVersion> query)
    {
        return query.Select(version => new ExamVersionData(
            version.Id,
            version.ExamId,
            version.VersionNumber,
            version.Status,
            version.Title,
            version.Description,
            version.Instructions,
            version.DurationMinutes,
            version.TotalScore,
            version.ContentRevision,
            version.CreatedByUserId,
            version.PublishedAtUtc,
            version.RetiredAtUtc,
            version.CreatedAtUtc,
            version.UpdatedAtUtc));
    }
}
