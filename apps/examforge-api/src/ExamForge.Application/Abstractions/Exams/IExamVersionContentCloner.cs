namespace ExamForge.Application.Abstractions;

public interface IExamVersionContentCloner
{
    Task CloneAsync(
        Guid sourceVersionId,
        Guid targetVersionId,
        CancellationToken cancellationToken = default);
}
