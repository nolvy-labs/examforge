namespace ExamForge.Domain.Exams;

public class FillAnswerKey
{
    public Question Question { get; set; } = null!;

    private FillAnswerKey () { }

    public Guid Id { get; set; }
    public Guid QuestionId { get; set; }
    public string BlankKey { get; set; } = string.Empty;
    public string AcceptedAnswer { get; set; } = string.Empty;
    public string NormalizedAnswer { get; set; } = string.Empty;
    public bool IsCaseSensitive { get; set; }
    public int DisplayOrder { get; set; }
    public DateTime CreatedAtUtc { get; set; }

}
