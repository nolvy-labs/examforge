using ExamForge.Application.Common;
using ExamForge.Application.Student.Exams.Enums;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Student.Exams.Dtos;

public sealed record GetStudentExamsRequest(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    Guid? TagId = null,
    ExamTagType? TagType = null,
    string? TagSlug = null,
    Guid? CategoryId = null,
    string? CategorySlug = null,
    StudentExamSortOrder Sort = StudentExamSortOrder.Newest);

public sealed record StudentExamListItemResponse(
    Guid Id,
    string Title,
    string Slug,
    string Description,
    ExamType Type,
    IReadOnlyList<StudentExamTagSummaryResponse> Tags,
    StudentPublishedVersionSummaryResponse PublishedVersion,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);

public sealed record StudentExamTagSummaryResponse(Guid Id, string Name, string Slug, ExamTagType Type);

public sealed record StudentPublishedVersionSummaryResponse(
    Guid Id,
    int VersionNumber,
    string Title,
    int? DurationMinutes,
    decimal TotalScore,
    int SectionCount,
    int QuestionCount,
    DateTimeOffset PublishedAtUtc);

public sealed record StudentExamSummaryResponse(
    StudentExamDetailResponse Exam,
    StudentPublishedVersionResponse PublishedVersion,
    IReadOnlyList<StudentExamSectionSummaryResponse> Sections);

public sealed record StudentExamDetailResponse(
    Guid Id,
    string Title,
    string Slug,
    string Description,
    ExamType Type,
    IReadOnlyList<StudentExamTagSummaryResponse> Tags,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);

public sealed record StudentPublishedVersionResponse(
    Guid Id,
    int VersionNumber,
    string Title,
    string Description,
    string Instructions,
    int? DurationMinutes,
    decimal TotalScore,
    long ContentRevision,
    DateTimeOffset PublishedAtUtc);

public sealed record StudentExamSectionSummaryResponse(
    Guid Id,
    ExamSectionKind Kind,
    string Title,
    string Instructions,
    string? StimulusText,
    string? MediaUrl,
    int DisplayOrder,
    int QuestionCount,
    decimal TotalPoints,
    System.Text.Json.JsonElement? Metadata);
