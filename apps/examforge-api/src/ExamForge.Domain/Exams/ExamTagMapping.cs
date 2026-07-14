using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Domain.Exams;

public sealed class ExamTagMapping
{
    private ExamTagMapping() { }

    public ExamTagMapping(Guid examId, Guid examTagId)
    {
        ExamId = examId;
        ExamTagId = examTagId;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid ExamId { get; private set; }
    public Guid ExamTagId { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }

    public Exam Exam { get; private set; } = null!;
    public ExamTag Tag { get; private set; } = null!;
}