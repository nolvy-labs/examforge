using ExamForge.Application.Student.ExamAttempts.Abstractions;
using ExamForge.Application.Student.ExamAttempts.Enums;
using ExamForge.Application.Student.ExamAttempts.Models;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

using Npgsql;

namespace ExamForge.Infrastructure.ExamAttempts;

public sealed class ExamAttemptRepository : IExamAttemptRepository
{
    private const string ActiveAttemptIndexName = "ux_exam_attempts_one_in_progress";
    private readonly ExamForgeDbContext _dbContext;

    public ExamAttemptRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<bool> ExamExistsAsync(
        Guid examId,
        CancellationToken cancellationToken = default) =>
        _dbContext.Exams.AsNoTracking().AnyAsync(
            exam => exam.Id == examId && !exam.IsArchived,
            cancellationToken);

    public Task<ExamVersion?> GetPublishedVersionAsync(
        Guid examId,
        CancellationToken cancellationToken = default) =>
        VersionGraph(_dbContext.ExamVersions.AsNoTracking())
            .SingleOrDefaultAsync(
                version =>
                    version.ExamId == examId &&
                    !version.Exam.IsArchived &&
                    version.Status == ExamVersionStatus.Published,
                cancellationToken);

    public Task<ExamAttempt?> GetActiveAsync(
        Guid studentId,
        Guid examVersionId,
        CancellationToken cancellationToken = default) =>
        AttemptGraph()
            .SingleOrDefaultAsync(
                attempt =>
                    attempt.StudentId == studentId &&
                    attempt.ExamVersionId == examVersionId &&
                    attempt.Status == ExamAttemptStatus.InProgress,
                cancellationToken);

    public Task<ExamAttempt?> GetOwnedAsync(
        Guid attemptId,
        Guid studentId,
        CancellationToken cancellationToken = default) =>
        AttemptGraph()
            .SingleOrDefaultAsync(
                attempt =>
                    attempt.Id == attemptId &&
                    attempt.StudentId == studentId,
                cancellationToken);

    public Task<ExamAttempt?> GetAsync(
        Guid attemptId,
        CancellationToken cancellationToken = default) =>
        AttemptGraph().SingleOrDefaultAsync(
            attempt => attempt.Id == attemptId,
            cancellationToken);

    public async Task<IReadOnlyList<ExamAttempt>> GetExpiredAsync(
        Guid studentId,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken = default) =>
        await AttemptGraph()
            .Where(attempt =>
                attempt.StudentId == studentId &&
                attempt.Mode == ExamAttemptMode.Exam &&
                attempt.Status == ExamAttemptStatus.InProgress &&
                attempt.ExpiresAtUtc.HasValue &&
                attempt.ExpiresAtUtc.Value <= nowUtc)
            .OrderBy(attempt => attempt.ExpiresAtUtc)
            .ThenBy(attempt => attempt.Id)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ExamAttempt>> GetExpiredBatchAsync(
        DateTimeOffset nowUtc,
        int take,
        CancellationToken cancellationToken = default) =>
        await AttemptGraph()
            .Where(attempt =>
                attempt.Mode == ExamAttemptMode.Exam &&
                attempt.Status == ExamAttemptStatus.InProgress &&
                attempt.ExpiresAtUtc.HasValue &&
                attempt.ExpiresAtUtc.Value <= nowUtc)
            .OrderBy(attempt => attempt.ExpiresAtUtc)
            .ThenBy(attempt => attempt.Id)
            .Take(take)
            .ToListAsync(cancellationToken);

    public async Task<AttemptCreatePersistenceResult> AddAsync(
        ExamAttempt attempt,
        CancellationToken cancellationToken = default)
    {
        _dbContext.ExamAttempts.Add(attempt);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            return new AttemptCreatePersistenceResult(true, null);
        }
        catch (DbUpdateException exception) when (IsActiveAttemptViolation(exception))
        {
            _dbContext.ChangeTracker.Clear();
            var existingId = await _dbContext.ExamAttempts
                .AsNoTracking()
                .Where(existing =>
                    existing.StudentId == attempt.StudentId &&
                    existing.ExamVersionId == attempt.ExamVersionId &&
                    existing.Status == ExamAttemptStatus.InProgress)
                .Select(existing => (Guid?)existing.Id)
                .SingleOrDefaultAsync(cancellationToken);
            return new AttemptCreatePersistenceResult(false, existingId);
        }
    }

    public async Task<AttemptSavePersistenceResult> SaveAsync(
        ExamAttempt attempt,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            return new AttemptSavePersistenceResult(true, attempt.Revision, attempt.Status);
        }
        catch (DbUpdateConcurrencyException)
        {
            _dbContext.ChangeTracker.Clear();
            var current = await _dbContext.ExamAttempts
                .AsNoTracking()
                .Where(item => item.Id == attempt.Id)
                .Select(item => new
                {
                    item.Revision,
                    item.Status
                })
                .SingleOrDefaultAsync(cancellationToken);
            return new AttemptSavePersistenceResult(
                false,
                current?.Revision,
                current?.Status);
        }
    }

    public async Task<ExamAttemptPageModel> GetPageAsync(
        Guid studentId,
        ExamAttemptStatus? status,
        Guid? examId,
        ExamAttemptSortOrder sort,
        int skip,
        int take,
        ExamAttemptMode? mode = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ExamAttempts.AsNoTracking()
            .Where(attempt => attempt.StudentId == studentId);
        if (status.HasValue)
        {
            query = query.Where(attempt => attempt.Status == status.Value);
        }

        if (mode.HasValue)
        {
            query = query.Where(attempt => attempt.Mode == mode.Value);
        }

        if (examId.HasValue)
        {
            query = query.Where(attempt => attempt.ExamId == examId.Value);
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var orderedQuery = sort == ExamAttemptSortOrder.CreatedAtAscending
            ? query.OrderBy(attempt => attempt.CreatedAtUtc)
                .ThenBy(attempt => attempt.Id)
            : query.OrderByDescending(attempt => attempt.CreatedAtUtc)
                .ThenByDescending(attempt => attempt.Id);
        var items = await orderedQuery
            .Skip(skip)
            .Take(take)
            .Select(attempt => new ExamAttemptListModel(
                attempt.Id,
                attempt.ExamId,
                attempt.ExamVersionId,
                attempt.Exam.Title,
                attempt.Exam.Slug,
                attempt.Status,
                attempt.Mode,
                attempt.StartedAtUtc,
                attempt.ExpiresAtUtc,
                attempt.SubmittedAtUtc,
                attempt.AbandonedAtUtc,
                attempt.Score,
                attempt.MaximumScore,
                attempt.Revision,
                attempt.CreatedAtUtc,
                attempt.UpdatedAtUtc))
            .ToListAsync(cancellationToken);
        return new ExamAttemptPageModel(items, totalItems);
    }

    private IQueryable<ExamAttempt> AttemptGraph() =>
        _dbContext.ExamAttempts
            .AsSplitQuery()
            .Include(attempt => attempt.Student)
            .Include(attempt => attempt.Exam)
            .Include(attempt => attempt.ExamVersion)
                .ThenInclude(version => version.Sections)
                    .ThenInclude(section => section.Questions)
                        .ThenInclude(question => question.Options)
            .Include(attempt => attempt.ExamVersion)
                .ThenInclude(version => version.Sections)
                    .ThenInclude(section => section.Questions)
                        .ThenInclude(question => question.FillAnswerKeys)
            .Include(attempt => attempt.Answers)
                .ThenInclude(answer => answer.SelectedOptions);

    private static IQueryable<ExamVersion> VersionGraph(IQueryable<ExamVersion> query) =>
        query
            .AsSplitQuery()
            .Include(version => version.Exam)
            .Include(version => version.Sections)
                .ThenInclude(section => section.Questions)
                    .ThenInclude(question => question.Options)
            .Include(version => version.Sections)
                .ThenInclude(section => section.Questions)
                    .ThenInclude(question => question.FillAnswerKeys);

    private static bool IsActiveAttemptViolation(DbUpdateException exception)
    {
        var postgresException = exception.InnerException as PostgresException;
        return postgresException?.SqlState == PostgresErrorCodes.UniqueViolation &&
            postgresException.ConstraintName == ActiveAttemptIndexName;
    }
}