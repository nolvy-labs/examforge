using ExamForge.Application.Student.ExamAttempts.Models;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Student.ExamAttempts.Abstractions;

public interface IExamAttemptRepository
{
    Task<bool> ExamExistsAsync(Guid examId, CancellationToken cancellationToken = default);
    Task<ExamVersion?> GetPublishedVersionAsync(Guid examId, CancellationToken cancellationToken = default);
    Task<ExamAttempt?> GetActiveAsync(Guid studentId, Guid examId, CancellationToken cancellationToken = default);
    Task<ExamAttempt?> GetOwnedAsync(Guid attemptId, Guid studentId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ExamAttempt>> GetExpiredAsync(
        Guid studentId,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken = default);
    Task<AttemptCreatePersistenceResult> AddAsync(
        ExamAttempt attempt,
        CancellationToken cancellationToken = default);
    Task<AttemptSavePersistenceResult> SaveAsync(
        ExamAttempt attempt,
        CancellationToken cancellationToken = default);
    Task<ExamAttemptPageModel> GetPageAsync(
        Guid studentId,
        bool completed,
        Guid? examId,
        int skip,
        int take,
        CancellationToken cancellationToken = default);
}
