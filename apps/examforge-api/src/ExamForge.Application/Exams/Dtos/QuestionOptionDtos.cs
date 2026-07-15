namespace ExamForge.Application.Exams.Dtos;

public sealed record CreateQuestionOptionDetail(
    string Text,
    string? Label = null,
    bool IsCorrect = false,
    string? Explanation = null);

public sealed record CreateQuestionOptionRequest(CreateQuestionOptionDetail Detail);

public sealed record UpdateQuestionOptionDetail(
    string? Text = null,
    string? Label = null,
    bool? IsCorrect = null,
    string? Explanation = null);

public sealed record UpdateQuestionOptionRequest(
    UpdateQuestionOptionDetail? Detail = null,
    bool ClearLabel = false,
    bool ClearExplanation = false);

public sealed record ReorderQuestionOptionsRequest(IReadOnlyList<Guid> OrderedOptionIds);

public sealed record QuestionOptionResponse(
    Guid Id,
    Guid QuestionId,
    string? Label,
    string Text,
    bool IsCorrect,
    int DisplayOrder,
    string? Explanation,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);
