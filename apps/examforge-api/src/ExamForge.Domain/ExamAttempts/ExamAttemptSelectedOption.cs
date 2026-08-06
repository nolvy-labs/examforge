using ExamForge.Domain.Exams;

namespace ExamForge.Domain.ExamAttempts;

public sealed class ExamAttemptSelectedOption
{
    private ExamAttemptSelectedOption() { }

    internal ExamAttemptSelectedOption(Guid examAttemptAnswerId, Guid questionOptionId)
    {
        ExamAttemptAnswerId = examAttemptAnswerId;
        QuestionOptionId = questionOptionId;
    }

    public Guid ExamAttemptAnswerId { get; private set; }
    public Guid QuestionOptionId { get; private set; }

    public ExamAttemptAnswer ExamAttemptAnswer { get; private set; } = null!;
    public QuestionOption QuestionOption { get; private set; } = null!;
}