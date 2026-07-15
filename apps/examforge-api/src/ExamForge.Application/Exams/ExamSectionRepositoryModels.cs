using ExamForge.Domain.Exams;

namespace ExamForge.Application.Exams;

public sealed record ExamSectionData(
    Guid Id,
    Guid ExamVersionId,
    Guid ExamId,
    ExamSectionKind Kind,
    string Title,
    string Instructions,
    string? StimulusText,
    string? MediaUrl,
    int DisplayOrder,
    int QuestionCount,
    decimal TotalPoints,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);