using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Models;

public sealed record QuestionData(
    Guid Id,
    Guid ExamSectionId,
    Guid? ParentQuestionId,
    QuestionType Type,
    string Prompt,
    string? Explanation,
    decimal Points,
    int DisplayOrder,
    int ChildQuestionCount,
    int OptionCount,
    int AnswerKeyCount,
    bool IsComplete,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);

public sealed record QuestionDetailData(
    QuestionData Question,
    IReadOnlyList<QuestionOptionData> Options,
    IReadOnlyList<FillAnswerKeyData> AnswerKeys);
