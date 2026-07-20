using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Dtos;

public sealed record CreateExamSectionDetail(
    string Title,
    ExamSectionKind Kind = ExamSectionKind.Default,
    string? Instructions = null,
    string? StimulusText = null,
    string? MediaUrl = null);

public sealed record CreateExamSectionInput(
    CreateExamSectionDetail Detail,
    IReadOnlyList<CreateQuestionInput>? Questions = null);

public sealed record CreateExamSectionRequest(
    CreateExamSectionDetail Detail,
    IReadOnlyList<CreateQuestionInput>? Questions = null);

public sealed record ReorderExamSectionsRequest(IReadOnlyList<Guid> OrderedSectionIds);

public sealed record ExamSectionSummaryResponse(
    Guid Id,
    Guid ExamVersionId,
    ExamSectionKind Kind,
    string Title,
    int DisplayOrder,
    int QuestionCount,
    decimal TotalPoints,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);

public sealed record ExamSectionDetailResponse(
    Guid Id,
    Guid ExamVersionId,
    ExamSectionKind Kind,
    string Title,
    int DisplayOrder,
    int QuestionCount,
    decimal TotalPoints,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc,
    string Instructions,
    string? StimulusText,
    string? MediaUrl,
    IReadOnlyList<QuestionDetailResponse>? Questions = null);