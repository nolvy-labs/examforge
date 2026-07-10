namespace ExamForge.Domain.Exams;

public class ExamVersion
{
    public Exam Exam { get; set; } = null!;
    public ICollection<ExamSection> Sections { get; set; } = new List<ExamSection>();
    public ICollection<ExamAttempt> Attempts { get; set; } = new List<ExamAttempt>();

    private ExamVersion () { }

    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public int VersionNumber { get; set; }
    public ExamVersionStatus Status { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public int? DurationMinutes { get; set; }
    public decimal TotalScore { get; set; }

    public DateTime? PublishedAtUtc { get; set; }
    public DateTime? RetiredAtUtc { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
