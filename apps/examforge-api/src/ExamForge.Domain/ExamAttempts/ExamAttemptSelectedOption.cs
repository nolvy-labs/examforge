
using ExamForge.Domain.Exams;

namespace ExamForge.Domain.ExamAttempts;

public class ExamAttemptSelectedOption
{
    public ExamAttemptAnswer ExamAttemptAnswer { get; set; } = null!;
    public QuestionOption QuestionOption { get; set; } = null!;

    private ExamAttemptSelectedOption() { }

    public Guid ExamAttemptAnswerId { get; set; }
    public Guid QuestionOptionId { get; set; }

}
