using ExamForge.Domain.Exams;

namespace ExamForge.Domain.ExamAttempts;

public sealed class ExamAttemptAnswer
{
    private readonly List<ExamAttemptSelectedOption> _selectedOptions = [];

    private ExamAttemptAnswer() { }

    internal ExamAttemptAnswer(
        Guid examAttemptId,
        Guid questionId,
        DateTimeOffset createdAtUtc)
    {
        Id = Guid.NewGuid();
        ExamAttemptId = examAttemptId;
        QuestionId = questionId;
        CreatedAtUtc = createdAtUtc;
    }

    public Guid Id { get; private set; }
    public Guid ExamAttemptId { get; private set; }
    public Guid QuestionId { get; private set; }
    public string? TextAnswer { get; private set; }
    public decimal? AwardedScore { get; private set; }
    public decimal? MaximumScore { get; private set; }
    public ExamAttemptAnswerGradingStatus? GradingStatus { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? UpdatedAtUtc { get; private set; }

    public ExamAttempt ExamAttempt { get; private set; } = null!;
    public Question Question { get; private set; } = null!;
    public IReadOnlyCollection<ExamAttemptSelectedOption> SelectedOptions => _selectedOptions;

    internal void ReplaceText(string? value, DateTimeOffset updatedAtUtc)
    {
        TextAnswer = value?.Trim();
        UpdatedAtUtc = updatedAtUtc;
    }

    internal void ReplaceSelectedOptions(
        IReadOnlyCollection<Guid> questionOptionIds,
        DateTimeOffset updatedAtUtc)
    {
        _selectedOptions.Clear();
        foreach (var optionId in questionOptionIds)
        {
            _selectedOptions.Add(new ExamAttemptSelectedOption(Id, optionId));
        }

        UpdatedAtUtc = updatedAtUtc;
    }

    internal void ApplyGrading(
        decimal awardedScore,
        decimal maximumScore,
        ExamAttemptAnswerGradingStatus gradingStatus,
        DateTimeOffset updatedAtUtc)
    {
        if (awardedScore < 0m || maximumScore < 0m || awardedScore > maximumScore)
        {
            throw new ArgumentOutOfRangeException(nameof(awardedScore));
        }

        AwardedScore = awardedScore;
        MaximumScore = maximumScore;
        GradingStatus = gradingStatus;
        UpdatedAtUtc = updatedAtUtc;
    }
}
