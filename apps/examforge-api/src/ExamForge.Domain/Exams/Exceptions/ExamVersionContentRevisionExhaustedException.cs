namespace ExamForge.Domain.Exams;

public sealed class ExamVersionContentRevisionExhaustedException : Exception
{
    public ExamVersionContentRevisionExhaustedException(Guid versionId)
        : base($"The content revision for exam version '{versionId}' is exhausted.")
    {
        VersionId = versionId;
    }

    public Guid VersionId { get; }
}
