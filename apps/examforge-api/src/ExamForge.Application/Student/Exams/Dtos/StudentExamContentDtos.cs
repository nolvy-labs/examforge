using System.Text.Json;
using System.Text.Json.Serialization;

using ExamForge.Domain.Exams;

namespace ExamForge.Application.Student.Exams.Dtos;

public sealed record StudentFullTestResponse(
    StudentExamDetailResponse Exam,
    StudentPublishedVersionResponse PublishedVersion,
    bool SolutionsIncluded,
    IReadOnlyList<StudentExamSectionContentResponse> Sections);

public sealed record StudentSingleSectionResponse(
    StudentExamDetailResponse Exam,
    StudentPublishedVersionResponse PublishedVersion,
    bool SolutionsIncluded,
    StudentExamSectionContentResponse Section,
    StudentSectionNavigationResponse Navigation);

public sealed record StudentSectionNavigationResponse(
    int Position,
    int TotalSections,
    Guid? PreviousSectionId,
    Guid? NextSectionId);

public sealed record StudentExamSectionContentResponse(
    Guid Id,
    ExamSectionKind Kind,
    string Title,
    string Instructions,
    string? StimulusText,
    string? MediaUrl,
    int DisplayOrder,
    int QuestionCount,
    decimal TotalPoints,
    JsonElement? Metadata,
    IReadOnlyList<StudentQuestionResponse> Questions);

public sealed record StudentQuestionResponse(
    Guid Id,
    Guid? ParentQuestionId,
    QuestionType Type,
    string Prompt,
    decimal Points,
    int DisplayOrder,
    JsonElement? Metadata,
    IReadOnlyList<StudentQuestionOptionResponse> Options,
    IReadOnlyList<StudentQuestionResponse> ChildQuestions,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    StudentQuestionSolutionResponse? Solution);

public sealed record StudentQuestionOptionResponse(Guid Id, string? Label, string Text, int DisplayOrder);

public sealed record StudentQuestionSolutionResponse(
    string? Explanation,
    IReadOnlyList<StudentQuestionOptionSolutionResponse> Options,
    IReadOnlyList<StudentFillAnswerSolutionResponse> AcceptedAnswers);

public sealed record StudentQuestionOptionSolutionResponse(Guid OptionId, bool IsCorrect, string? Explanation);

public sealed record StudentFillAnswerSolutionResponse(
    string BlankKey,
    string AcceptedAnswer,
    bool IsCaseSensitive,
    int DisplayOrder);