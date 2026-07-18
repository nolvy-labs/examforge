using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Dtos;

public sealed record CreateQuestionDetail(
    QuestionType Type,
    string Prompt,
    string? Explanation = null,
    decimal? Points = null);

public sealed record CreateQuestionRequest(
    CreateQuestionDetail Detail,
    Guid? ParentQuestionId = null,
    IReadOnlyList<CreateChildQuestionInput>? ChildQuestions = null,
    IReadOnlyList<CreateQuestionOptionDetail>? Options = null,
    IReadOnlyList<CreateFillAnswerKeyInput>? AnswerKeys = null);

public sealed record CreateQuestionInput(
    CreateQuestionDetail Detail,
    IReadOnlyList<CreateChildQuestionInput>? ChildQuestions = null,
    IReadOnlyList<CreateQuestionOptionDetail>? Options = null,
    IReadOnlyList<CreateFillAnswerKeyInput>? AnswerKeys = null);

public sealed record CreateChildQuestionInput(
    CreateQuestionDetail Detail,
    IReadOnlyList<CreateQuestionOptionDetail>? Options = null,
    IReadOnlyList<CreateFillAnswerKeyInput>? AnswerKeys = null);

public sealed record UpdateQuestionDetail(
    QuestionType? Type = null,
    string? Prompt = null,
    string? Explanation = null,
    decimal? Points = null);

public sealed record UpdateQuestionRequest(
    UpdateQuestionDetail? Detail = null,
    bool ClearExplanation = false);

public sealed record ReorderQuestionsRequest(
    Guid? ParentQuestionId,
    IReadOnlyList<Guid> OrderedQuestionIds);

public sealed record QuestionSummaryResponse(
    Guid Id,
    Guid ExamSectionId,
    Guid? ParentQuestionId,
    QuestionType Type,
    string Prompt,
    decimal Points,
    int DisplayOrder,
    int ChildQuestionCount,
    int OptionCount,
    int AnswerKeyCount,
    bool IsComplete,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);

public sealed record QuestionDetailResponse(
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
    DateTimeOffset? UpdatedAtUtc,
    IReadOnlyList<QuestionOptionResponse> Options,
    IReadOnlyList<FillAnswerKeyResponse> AnswerKeys,
    IReadOnlyList<QuestionDetailResponse>? ChildQuestions = null);