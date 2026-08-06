using ExamForge.Application.Admin.ExamAttempts.Models;

namespace ExamForge.Application.Admin.ExamAttempts.Abstractions;

public interface IAdminAttemptQuery
{
    Task<bool> ExamExistsAsync(Guid examId, CancellationToken cancellationToken = default);
    Task<bool> UserExistsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> AttemptExistsAsync(Guid attemptId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Guid>> GetExpiredIdsForExamAsync(
        Guid examId,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Guid>> GetExpiredIdsForUserAsync(
        Guid userId,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken = default);
    Task<AdminAttemptPageModel> GetPageAsync(
        AdminAttemptPageQuery query,
        CancellationToken cancellationToken = default);
}