using ExamForge.Application.Admin.Exams.Enums;
namespace ExamForge.Application.Admin.Exams.Dtos;

public sealed record CreateFillAnswerKeyRequest(
    string AcceptedAnswer,
    bool IsCaseSensitive = false);

public sealed record CreateFillAnswerKeyInput(
    string AcceptedAnswer,
    bool IsCaseSensitive = false);

public sealed record UpdateFillAnswerKeyRequest(
    string? AcceptedAnswer = null,
    bool? IsCaseSensitive = null);

public sealed record FillAnswerKeyResponse(
    Guid Id,
    Guid QuestionId,
    string BlankKey,
    string AcceptedAnswer,
    bool IsCaseSensitive,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);