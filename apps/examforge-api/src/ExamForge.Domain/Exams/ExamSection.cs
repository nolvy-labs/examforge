namespace ExamForge.Domain.Exams;

public class ExamSection
{
    public ExamVersion ExamVersion { get; set; } = null!;
    public ICollection<Question> Questions { get; set; } = new List<Question>();

    private ExamSection () { }

    public Guid Id { get; set; }
    public Guid ExamVersionId { get; set; }
    public ExamSectionKind Kind { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public string? StimulusText { get; set; }
    public string? MediaUrl { get; set; }
    public int DisplayOrder { get; set; }
    public string? MetadataJson { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
