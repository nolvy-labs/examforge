using ExamForge.Application.Admin.ExamAttempts.Abstractions;
using ExamForge.Application.Admin.ExamAttempts.Models;
using ExamForge.Application.Admin.Users.Models;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.ExamAttempts;

public sealed class AdminAttemptQuery : IAdminAttemptQuery
{
    private readonly ExamForgeDbContext _dbContext;

    public AdminAttemptQuery(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<bool> ExamExistsAsync(
        Guid examId,
        CancellationToken cancellationToken = default) =>
        _dbContext.Exams.AsNoTracking().AnyAsync(exam => exam.Id == examId, cancellationToken);

    public Task<bool> UserExistsAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        _dbContext.Users.AsNoTracking().AnyAsync(user => user.Id == userId, cancellationToken);

    public Task<bool> AttemptExistsAsync(
        Guid attemptId,
        CancellationToken cancellationToken = default) =>
        _dbContext.ExamAttempts.AsNoTracking()
            .AnyAsync(attempt => attempt.Id == attemptId, cancellationToken);

    public async Task<IReadOnlyList<Guid>> GetExpiredIdsForExamAsync(
        Guid examId,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken = default) =>
        await Expired(nowUtc)
            .Where(attempt => attempt.ExamId == examId)
            .OrderBy(attempt => attempt.ExpiresAtUtc)
            .ThenBy(attempt => attempt.Id)
            .Select(attempt => attempt.Id)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Guid>> GetExpiredIdsForUserAsync(
        Guid userId,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken = default) =>
        await Expired(nowUtc)
            .Where(attempt => attempt.StudentId == userId)
            .OrderBy(attempt => attempt.ExpiresAtUtc)
            .ThenBy(attempt => attempt.Id)
            .Select(attempt => attempt.Id)
            .ToListAsync(cancellationToken);

    public async Task<AdminAttemptPageModel> GetPageAsync(
        AdminAttemptPageQuery request,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ExamAttempts.AsNoTracking().AsQueryable();
        query = request.Scope == AdminAttemptScope.Exam
            ? query.Where(attempt => attempt.ExamId == request.ScopeId)
            : query.Where(attempt => attempt.StudentId == request.ScopeId);

        if (request.Search is not null)
        {
            var pattern = $"%{EscapeLikePattern(request.Search)}%";
            query = request.Scope == AdminAttemptScope.Exam
                ? query.Where(attempt =>
                    (attempt.Student.DisplayName != null &&
                        EF.Functions.ILike(attempt.Student.DisplayName, pattern, "\\")) ||
                    EF.Functions.ILike(attempt.Student.Email, pattern, "\\"))
                : query.Where(attempt =>
                    EF.Functions.ILike(attempt.Exam.Title, pattern, "\\") ||
                    EF.Functions.ILike(attempt.Exam.Slug, pattern, "\\"));
        }

        if (request.Status.HasValue)
        {
            query = query.Where(attempt => attempt.Status == request.Status.Value);
        }

        if (request.Mode.HasValue)
        {
            query = query.Where(attempt => attempt.Mode == request.Mode.Value);
        }

        if (request.CreatedFromUtc.HasValue)
        {
            query = query.Where(attempt => attempt.CreatedAtUtc >= request.CreatedFromUtc.Value);
        }

        if (request.CreatedToUtc.HasValue)
        {
            query = query.Where(attempt => attempt.CreatedAtUtc < request.CreatedToUtc.Value);
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var ordered = request.Sort == AdminCreatedAtSort.Ascending
            ? query.OrderBy(attempt => attempt.CreatedAtUtc).ThenBy(attempt => attempt.Id)
            : query.OrderByDescending(attempt => attempt.CreatedAtUtc)
                .ThenByDescending(attempt => attempt.Id);
        var items = await ordered
            .Skip(request.Skip)
            .Take(request.Take)
            .Select(attempt => new AdminAttemptListModel(
                attempt.Id,
                attempt.Status,
                attempt.Mode,
                attempt.Revision,
                attempt.StartedAtUtc,
                attempt.ExpiresAtUtc,
                attempt.SubmittedAtUtc,
                attempt.AbandonedAtUtc,
                attempt.CreatedAtUtc,
                attempt.UpdatedAtUtc,
                attempt.StudentId,
                attempt.Student.DisplayName,
                attempt.Student.Email,
                attempt.ExamId,
                attempt.Exam.Title,
                attempt.Exam.Slug,
                attempt.ExamVersionId,
                attempt.ExamVersion.VersionNumber,
                attempt.ExamVersion.Title,
                attempt.Score,
                attempt.MaximumScore))
            .ToListAsync(cancellationToken);
        return new(items, totalItems);
    }

    private IQueryable<ExamAttempt> Expired(DateTimeOffset nowUtc) =>
        _dbContext.ExamAttempts
            .AsNoTracking()
            .Where(attempt =>
                attempt.Mode == ExamAttemptMode.Exam &&
                attempt.Status == ExamAttemptStatus.InProgress &&
                attempt.ExpiresAtUtc.HasValue &&
                attempt.ExpiresAtUtc.Value <= nowUtc);

    private static string EscapeLikePattern(string value) =>
        value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
}