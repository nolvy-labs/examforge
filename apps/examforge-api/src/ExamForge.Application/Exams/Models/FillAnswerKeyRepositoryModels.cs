namespace ExamForge.Application.Exams;

public sealed record FillAnswerKeyData(
    Guid Id,
    Guid QuestionId,
    string BlankKey,
    string AcceptedAnswer,
    bool IsCaseSensitive,
    int DisplayOrder,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);
