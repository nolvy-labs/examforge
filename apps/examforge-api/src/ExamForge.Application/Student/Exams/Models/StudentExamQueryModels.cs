using ExamForge.Application.Student.Exams.Enums;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Student.Exams.Models;

public sealed record StudentExamPageQuery(
    int Skip, int Take, string? Search, Guid? TagId, ExamTagType? TagType, string? TagSlug,
    Guid? CategoryId, string? CategorySlug, StudentExamSortOrder Sort);

public sealed record StudentExamPageModel(IReadOnlyList<StudentExamListModel> Items, int TotalItems);
public sealed record StudentExamListModel(
    Guid Id, string Title, string Slug, string Description, ExamType Type,
    DateTimeOffset CreatedAtUtc, DateTimeOffset? UpdatedAtUtc,
    StudentPublishedVersionSummaryModel PublishedVersion, IReadOnlyList<StudentExamTagModel> Tags);
public sealed record StudentExamTagModel(Guid Id, string Name, string Slug, ExamTagType Type);
public sealed record StudentPublishedVersionSummaryModel(
    Guid Id, int VersionNumber, string Title, int? DurationMinutes, decimal TotalScore,
    int SectionCount, int QuestionCount, DateTimeOffset PublishedAtUtc);

public sealed record StudentPublishedExamModel(
    Guid ExamId, string ExamTitle, string ExamSlug, string ExamDescription, ExamType ExamType,
    DateTimeOffset ExamCreatedAtUtc, DateTimeOffset? ExamUpdatedAtUtc,
    Guid VersionId, int VersionNumber, string VersionTitle, string VersionDescription,
    string VersionInstructions, int? DurationMinutes, decimal TotalScore, long ContentRevision,
    DateTimeOffset PublishedAtUtc);

public sealed record StudentSectionModel(
    Guid Id, ExamSectionKind Kind, string Title, string Instructions, string? StimulusText,
    string? MediaUrl, int DisplayOrder, int QuestionCount, decimal TotalPoints, string? MetadataJson);
public sealed record StudentSectionIdentifierModel(Guid Id, int DisplayOrder);
public sealed record StudentQuestionModel(
    Guid Id, Guid ExamSectionId, Guid? ParentQuestionId, QuestionType Type, string Prompt,
    string? Explanation, decimal Points, int DisplayOrder, string? MetadataJson);
public sealed record StudentOptionModel(
    Guid Id, Guid QuestionId, string? Label, string Text, int DisplayOrder);
public sealed record StudentOptionSolutionModel(Guid OptionId, bool IsCorrect, string? Explanation);
public sealed record StudentFillAnswerModel(
    Guid QuestionId, string BlankKey, string AcceptedAnswer, bool IsCaseSensitive, int DisplayOrder, Guid Id);
