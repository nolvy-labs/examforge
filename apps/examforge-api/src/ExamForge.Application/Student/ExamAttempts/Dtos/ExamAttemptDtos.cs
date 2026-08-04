using System.Text.Json;
using System.Text.Json.Serialization;

using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Student.ExamAttempts.Dtos;

public sealed class ExamAttemptPatchDocumentModel
{
    public Dictionary<string, object?> Answers { get; set; } = [];
}

public sealed record StartExamAttemptRequest(ExamAttemptMode? Mode = null);

public sealed record SubmitExamAttemptRequest(
    IReadOnlyList<SubmitExamAttemptAnswerRequest>? Answers = null);

public sealed record SubmitExamAttemptAnswerRequest(
    Guid QuestionId,
    string? TextAnswer,
    IReadOnlyList<Guid>? SelectedOptionIds);

public sealed record GetExamAttemptsRequest(
    string? Status = null,
    string? Mode = null,
    string? Sort = "created-at-desc",
    int Page = 1,
    int PageSize = 20,
    Guid? ExamId = null);

public sealed record ExamAttemptListItemResponse(
    Guid AttemptId,
    Guid ExamId,
    Guid ExamVersionId,
    string ExamTitle,
    string ExamSlug,
    ExamAttemptStatus Status,
    ExamAttemptMode Mode,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset? ExpiresAtUtc,
    DateTimeOffset? SubmittedAtUtc,
    DateTimeOffset? AbandonedAtUtc,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? Score,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? MaximumScore,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? Percentage,
    long Revision,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record ExamAttemptDetailResponse(
    Guid AttemptId,
    Guid ExamId,
    Guid ExamVersionId,
    ExamAttemptStatus Status,
    ExamAttemptMode Mode,
    long Revision,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset? ExpiresAtUtc,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] long? RemainingTimeSeconds,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] DateTimeOffset? SubmittedAtUtc,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] DateTimeOffset? AbandonedAtUtc,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? Score,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? MaximumScore,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? Percentage,
    ExamAttemptExamResponse Exam,
    ExamAttemptVersionResponse ExamVersion,
    IReadOnlyList<ExamAttemptSectionResponse> Sections);

public sealed record ExamAttemptExamResponse(
    string Title,
    string Slug,
    string Description,
    ExamType Type);

public sealed record ExamAttemptVersionResponse(
    int VersionNumber,
    string Title,
    string Description,
    string Instructions,
    int? DurationMinutes);

public sealed record ExamAttemptSectionResponse(
    Guid Id,
    ExamSectionKind Kind,
    string Title,
    string Instructions,
    string? StimulusText,
    string? MediaUrl,
    int DisplayOrder,
    JsonElement? Metadata,
    IReadOnlyList<ExamAttemptQuestionResponse> Questions);

public sealed record ExamAttemptQuestionResponse(
    Guid Id,
    Guid? ParentQuestionId,
    QuestionType Type,
    string Prompt,
    decimal Points,
    int DisplayOrder,
    JsonElement? Metadata,
    IReadOnlyList<ExamAttemptOptionResponse> Options,
    IReadOnlyList<ExamAttemptQuestionResponse> ChildQuestions,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    ExamAttemptAnswerResponse? Answer,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    ExamAttemptSolutionResponse? Solution);

public sealed record ExamAttemptOptionResponse(
    Guid Id,
    string? Label,
    string Text,
    int DisplayOrder);

public sealed record ExamAttemptAnswerResponse(
    string? TextAnswer,
    IReadOnlyList<Guid> SelectedOptionIds,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? AwardedScore,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? MaximumScore,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    ExamAttemptAnswerGradingStatus? GradingStatus);

public sealed record ExamAttemptSolutionResponse(
    string? Explanation,
    IReadOnlyList<ExamAttemptOptionSolutionResponse> Options,
    IReadOnlyList<ExamAttemptFillAnswerSolutionResponse> AcceptedAnswers);

public sealed record ExamAttemptOptionSolutionResponse(
    Guid OptionId,
    bool IsCorrect,
    string? Explanation);

public sealed record ExamAttemptFillAnswerSolutionResponse(
    string BlankKey,
    string AcceptedAnswer,
    bool IsCaseSensitive,
    int DisplayOrder);