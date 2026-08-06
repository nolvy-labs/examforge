using ExamForge.Application.Admin.Users.Abstractions;
using ExamForge.Application.Admin.Users.Models;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Users;

public sealed class AdminUserQuery : IAdminUserQuery
{
    private readonly ExamForgeDbContext _dbContext;

    public AdminUserQuery(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AdminUserPageModel> GetPageAsync(
        AdminUserPageQuery request,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Users.AsNoTracking().AsQueryable();
        if (request.Search is not null)
        {
            var pattern = $"%{EscapeLikePattern(request.Search)}%";
            query = query.Where(user =>
                (user.DisplayName != null &&
                    EF.Functions.ILike(user.DisplayName, pattern, "\\")) ||
                EF.Functions.ILike(user.Email, pattern, "\\"));
        }

        if (request.Role.HasValue)
        {
            query = query.Where(user => user.Role == request.Role.Value);
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(user => user.IsActive == request.IsActive.Value);
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var ordered = request.Sort == AdminCreatedAtSort.Ascending
            ? query.OrderBy(user => user.CreatedAtUtc).ThenBy(user => user.Id)
            : query.OrderByDescending(user => user.CreatedAtUtc)
                .ThenByDescending(user => user.Id);
        var items = await ordered
            .Skip(request.Skip)
            .Take(request.Take)
            .Select(user => new AdminUserModel(
                user.Id,
                user.Email,
                user.DisplayName,
                user.Role,
                user.IsActive,
                user.CreatedAtUtc,
                user.UpdatedAtUtc))
            .ToListAsync(cancellationToken);
        return new(items, totalItems);
    }

    public Task<AdminUserModel?> GetByIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        _dbContext.Users
            .AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => new AdminUserModel(
                user.Id,
                user.Email,
                user.DisplayName,
                user.Role,
                user.IsActive,
                user.CreatedAtUtc,
                user.UpdatedAtUtc))
            .SingleOrDefaultAsync(cancellationToken);

    public async Task<AdminUserStatisticsModel> GetStatisticsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var attempts = _dbContext.ExamAttempts
            .AsNoTracking()
            .Where(attempt => attempt.StudentId == userId);
        var counts = await attempts
            .GroupBy(_ => 1)
            .Select(group => new
            {
                Total = group.Count(),
                InProgress = group.Count(a => a.Status == ExamAttemptStatus.InProgress),
                Submitted = group.Count(a => a.Status == ExamAttemptStatus.Submitted),
                Abandoned = group.Count(a => a.Status == ExamAttemptStatus.Abandoned),
                Practice = group.Count(a => a.Mode == ExamAttemptMode.Practice),
                Exam = group.Count(a => a.Mode == ExamAttemptMode.Exam),
                Last = group.Max(a => (DateTimeOffset?)a.CreatedAtUtc)
            })
            .SingleOrDefaultAsync(cancellationToken);
        var submittedPercentages = attempts
            .Where(attempt =>
                attempt.Status == ExamAttemptStatus.Submitted &&
                attempt.Score.HasValue &&
                attempt.MaximumScore.HasValue)
            .Select(attempt => (decimal?)(attempt.MaximumScore == 0m
                ? 0m
                : attempt.Score!.Value / attempt.MaximumScore!.Value * 100m));
        var average = await submittedPercentages.AverageAsync(cancellationToken);
        var best = await submittedPercentages.MaxAsync(cancellationToken);
        var answered = await _dbContext.ExamAttemptAnswers
            .AsNoTracking()
            .CountAsync(answer =>
                answer.ExamAttempt.StudentId == userId &&
                ((!string.IsNullOrEmpty(answer.TextAnswer) && answer.TextAnswer.Trim() != "") ||
                    answer.SelectedOptions.Any()),
                cancellationToken);

        return new(
            counts?.Total ?? 0,
            counts?.InProgress ?? 0,
            counts?.Submitted ?? 0,
            counts?.Abandoned ?? 0,
            counts?.Practice ?? 0,
            counts?.Exam ?? 0,
            average,
            best,
            answered,
            counts?.Last);
    }

    private static string EscapeLikePattern(string value) =>
        value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
}