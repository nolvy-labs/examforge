using ExamForge.Application.Admin.Exams.Enums;
namespace ExamForge.Application.Admin.Exams.Models;

public sealed record FillAnswerKeyData(
    Guid Id,
    Guid QuestionId,
    string BlankKey,
    string AcceptedAnswer,
    bool IsCaseSensitive,
    int DisplayOrder,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);
