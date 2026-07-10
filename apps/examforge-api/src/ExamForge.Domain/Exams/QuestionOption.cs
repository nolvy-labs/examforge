namespace ExamForge.Domain.Exams;

public class QuestionOption
{
    public Question Question { get; set; } = null!;

    private QuestionOption () { }

    public Guid Id { get; set; }
    public Guid QuestionId { get; set; }
    public string? Label { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int DisplayOrder { get; set; }
    public string? Explanation { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
