namespace ExamForge.Domain.ExamAttempts;

public sealed record ExamAttemptAnswerUpdate(
    Guid QuestionId,
    string? TextAnswer,
    IReadOnlyCollection<Guid> SelectedOptionIds,
    bool ReplaceText,
    bool ReplaceSelectedOptions);

public sealed record ExamAttemptAnswerGradeResult(
    Guid QuestionId,
    decimal AwardedScore,
    decimal MaximumScore,
    ExamAttemptAnswerGradingStatus Status);
