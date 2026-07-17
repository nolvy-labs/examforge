namespace ExamForge.Application.Exams;

public sealed record QuestionOptionData(
    Guid Id,
    Guid QuestionId,
    string? Label,
    string Text,
    bool IsCorrect,
    int DisplayOrder,
    string? Explanation,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);
