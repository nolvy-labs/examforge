namespace ExamForge.Domain.Exams;

public class Question
{
    public ExamSection ExamSection { get; set; } = null!;
    public Question? ParentQuestion { get; set; }
    public ICollection<Question> ChildQuestions { get; set; } = new List<Question>();
    public ICollection<QuestionOption> Options { get; set; } = new List<QuestionOption>();
    public ICollection<FillAnswerKey> FillAnswerKeys { get; set; } = new List<FillAnswerKey>();

    private Question () { }

    public Guid Id { get; set; }
    public Guid ExamSectionId { get; set; }
    public Guid? ParentQuestionId { get; set; }
    public QuestionType Type { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public decimal Points { get; set; }
    public int DisplayOrder { get; set; }
    public string? MetadataJson { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}