using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Domain.Exams;

public class ExamTagMapping
{
    public Exam Exam { get; set; } = null!;
    public ExamTag Tag { get; set; } = null!;

    private ExamTagMapping () { }

    public Guid ExamId { get; set; }
    public Guid ExamTagId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
