using ExamForge.Domain.ExamAttempts;

namespace ExamForge.Domain.Exams;

public class Exam
{
    public ICollection<ExamTagMapping> ExamTagMappings { get; set; } = new List<ExamTagMapping>();
    public ICollection<ExamVersion> Versions { get; set; } = new List<ExamVersion>();
    public ICollection<ExamAttempt> Attempts { get; set; } = new List<ExamAttempt>();

    private Exam() { }

    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ExamType Type { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
