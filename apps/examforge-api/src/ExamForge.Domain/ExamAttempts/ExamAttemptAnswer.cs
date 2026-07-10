
using ExamForge.Domain.Exams;

namespace ExamForge.Domain.ExamAttempts;

public class ExamAttemptAnswer
{
    public ExamAttempt ExamAttempt { get; set; } = null!;
    public Question Question { get; set; } = null!;
    public ICollection<ExamAttemptSelectedOption> SelectedOptions { get; set; } = new List<ExamAttemptSelectedOption>();

    private ExamAttemptAnswer() { }

    public Guid Id { get; set; }
    public Guid ExamAttemptId { get; set; }
    public Guid QuestionId { get; set; }
    public string? TextAnswer { get; set; }
    public bool? IsCorrect { get; set; }
    public decimal? Score { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
