namespace ExamForge.Application.Abstractions;

public interface IExamVersionContentCloner
{
    Task<ExamVersionContentCloneResult> CloneAsync(
        Guid sourceVersionId,
        Guid targetVersionId,
        CancellationToken cancellationToken = default);
}

public enum ExamVersionContentCloneResult
{
    Success = 0,
    ContentCloneNotAvailable = 1
}