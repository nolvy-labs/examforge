using ExamForge.Application.Exams;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Abstractions;

public interface IExamVersionRepository
{
    Task<ExamVersionRepositoryPage> GetPageAsync(
        Guid examId,
        ExamVersionPageQuery query,
        CancellationToken cancellationToken = default);

    Task<ExamVersionData?> GetDetailAsync(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken = default);

    Task<ExamVersionData?> GetCurrentPublishedAsync(
        Guid examId,
        CancellationToken cancellationToken = default);

    Task<ExamVersion?> GetTrackedAsync(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken = default);

    Task<ExamVersion?> GetTrackedCurrentPublishedAsync(
        Guid examId,
        Guid excludedVersionId,
        CancellationToken cancellationToken = default);

    Task<ExamVersionData?> GetSourceForCloneAsync(
        Guid examId,
        Guid sourceVersionId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Locks and returns the parent exam. An explicit database transaction must already be active.
    /// </summary>
    Task<Exam?> GetExamForUpdateAsync(
        Guid examId,
        CancellationToken cancellationToken = default);

    Task<bool> ExamExistsAsync(
        Guid examId,
        CancellationToken cancellationToken = default);

    void Add(ExamVersion version);
    void Remove(ExamVersion version);
}