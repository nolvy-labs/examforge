using ExamForge.Application.Admin.Exams.Enums;
namespace ExamForge.Application.Admin.Exams.Models;

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
