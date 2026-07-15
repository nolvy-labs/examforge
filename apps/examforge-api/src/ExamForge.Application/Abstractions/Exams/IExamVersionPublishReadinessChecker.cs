namespace ExamForge.Application.Abstractions;

public interface IExamVersionPublishReadinessChecker
{
    Task<bool> IsReadyAsync(
        Guid versionId,
        CancellationToken cancellationToken = default);
}