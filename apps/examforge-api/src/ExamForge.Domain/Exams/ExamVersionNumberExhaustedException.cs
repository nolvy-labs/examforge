namespace ExamForge.Domain.Exams;

public sealed class ExamVersionNumberExhaustedException : InvalidOperationException
{
    public ExamVersionNumberExhaustedException(Guid examId)
        : base($"Exam '{examId}' has exhausted its version-number sequence.")
    {
        ExamId = examId;
    }

    public Guid ExamId { get; }
}