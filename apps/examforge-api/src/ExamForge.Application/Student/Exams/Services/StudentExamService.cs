using System.Text.Json;

using ExamForge.Application.Common;
using ExamForge.Application.Student.ExamClassifications.Abstractions;
using ExamForge.Application.Student.Exams.Abstractions;
using ExamForge.Application.Student.Exams.Dtos;
using ExamForge.Application.Student.Exams.Errors;
using ExamForge.Application.Student.Exams.Models;
using ExamForge.Domain.Common;

namespace ExamForge.Application.Student.Exams.Services;

public sealed class StudentExamService
{
    public const int MaximumTagValues = 20;
    private readonly IStudentExamQuery _query;
    private readonly IStudentExamDiscoveryQuery _discoveryQuery;

    public StudentExamService(
        IStudentExamQuery query,
        IStudentExamDiscoveryQuery discoveryQuery)
    {
        _query = query;
        _discoveryQuery = discoveryQuery;
    }

    public async Task<Result<CollectionResponse<StudentExamListItemResponse>, StudentExamError>> GetPageAsync(
        GetStudentExamsRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Page < 1)
            return Result<CollectionResponse<StudentExamListItemResponse>, StudentExamError>.Failure(StudentExamError.InvalidPage);
        if (request.PageSize is < 1 or > 100)
            return Result<CollectionResponse<StudentExamListItemResponse>, StudentExamError>.Failure(StudentExamError.InvalidPageSize);
        if (!Enum.IsDefined(request.Sort))
            return Result<CollectionResponse<StudentExamListItemResponse>, StudentExamError>.Failure(StudentExamError.InvalidSort);
        if (request.Page - 1 > int.MaxValue / request.PageSize)
            return Result<CollectionResponse<StudentExamListItemResponse>, StudentExamError>.Failure(StudentExamError.InvalidPage);

        var tagValues = request.TagIds ?? [];
        if (tagValues.Count > MaximumTagValues)
        {
            return Result<CollectionResponse<StudentExamListItemResponse>, StudentExamError>.Failure(
                StudentExamError.TooManyTagValues);
        }

        if (request.CategorySlug is not null &&
            string.IsNullOrWhiteSpace(request.CategorySlug))
        {
            return Result<CollectionResponse<StudentExamListItemResponse>, StudentExamError>.Failure(
                StudentExamError.InvalidCategorySelector);
        }

        var tagIds = tagValues.Distinct().ToList();
        var activeTagIds = await _discoveryQuery.GetActiveTagIdsAsync(
            tagIds,
            cancellationToken);
        var invalidTagIds = tagIds.Except(activeTagIds).ToList();
        if (invalidTagIds.Count > 0)
        {
            return Result<CollectionResponse<StudentExamListItemResponse>, StudentExamError>.Failure(
                StudentExamError.InvalidTagIds,
                invalidTagIds);
        }

        var categorySlug = request.CategorySlug is null
            ? null
            : TextNormalizer.NormalizeSlug(request.CategorySlug);
        var category = categorySlug is null
            ? null
            : await _discoveryQuery.GetCategoryRuleBySlugAsync(
                categorySlug,
                cancellationToken);
        if (categorySlug is not null && category is null)
        {
            return Result<CollectionResponse<StudentExamListItemResponse>, StudentExamError>.Failure(
                StudentExamError.CategoryNotFound);
        }

        var search = string.IsNullOrWhiteSpace(request.Search)
            ? null
            : TextNormalizer.NormalizeName(request.Search);

        var page = await _query.GetPageAsync(new StudentExamPageQuery(
            checked((request.Page - 1) * request.PageSize),
            request.PageSize,
            search,
            tagIds,
            category,
            request.Sort), cancellationToken);

        var totalPages = page.TotalItems == 0
            ? 0
            : (int)Math.Ceiling(page.TotalItems / (double)request.PageSize);
        var response = new CollectionResponse<StudentExamListItemResponse>(
            page.Items.Select(ToListResponse).ToList(),
            new CollectionMeta(request.Page, request.PageSize, page.TotalItems, totalPages,
                request.Page > 1 && page.TotalItems > 0, request.Page < totalPages));
        return Result<CollectionResponse<StudentExamListItemResponse>, StudentExamError>.Success(response);
    }

    public async Task<Result<StudentExamSummaryResponse, StudentExamError>> GetSummaryAsync(
        string idOrSlug, CancellationToken cancellationToken = default)
    {
        var context = await LoadContextAsync(idOrSlug, cancellationToken);
        if (context is null)
            return Result<StudentExamSummaryResponse, StudentExamError>.Failure(StudentExamError.PublishedExamNotFound);

        var sections = await _query.GetSectionsAsync(context.Exam.VersionId, cancellationToken);
        return Result<StudentExamSummaryResponse, StudentExamError>.Success(new StudentExamSummaryResponse(
            context.Detail, ToVersionResponse(context.Exam), sections.Select(ToSectionSummary).ToList()));
    }

    public async Task<Result<StudentFullTestResponse, StudentExamError>> GetFullTestAsync(
        string idOrSlug, bool includeSolutions, CancellationToken cancellationToken = default)
    {
        var context = await LoadContextAsync(idOrSlug, cancellationToken);
        if (context is null)
            return Result<StudentFullTestResponse, StudentExamError>.Failure(StudentExamError.PublishedExamNotFound);

        var sections = await _query.GetSectionsAsync(context.Exam.VersionId, cancellationToken);
        var content = await LoadContentAsync(sections, includeSolutions, cancellationToken);
        return Result<StudentFullTestResponse, StudentExamError>.Success(new StudentFullTestResponse(
            context.Detail, ToVersionResponse(context.Exam), includeSolutions, content));
    }

    public async Task<Result<StudentSingleSectionResponse, StudentExamError>> GetFirstSectionAsync(
        string idOrSlug, bool includeSolutions, CancellationToken cancellationToken = default)
    {
        var context = await LoadContextAsync(idOrSlug, cancellationToken);
        if (context is null)
            return Result<StudentSingleSectionResponse, StudentExamError>.Failure(StudentExamError.PublishedExamNotFound);
        var identifiers = await _query.GetSectionIdentifiersAsync(context.Exam.VersionId, cancellationToken);
        if (identifiers.Count == 0)
            return Result<StudentSingleSectionResponse, StudentExamError>.Failure(StudentExamError.SectionNotFound);
        return await BuildSingleSectionAsync(context, identifiers, 0, includeSolutions, cancellationToken);
    }

    public async Task<Result<StudentSingleSectionResponse, StudentExamError>> GetSectionAsync(
        string idOrSlug, Guid sectionId, bool includeSolutions, CancellationToken cancellationToken = default)
    {
        var context = await LoadContextAsync(idOrSlug, cancellationToken);
        if (context is null)
            return Result<StudentSingleSectionResponse, StudentExamError>.Failure(StudentExamError.PublishedExamNotFound);
        var identifiers = await _query.GetSectionIdentifiersAsync(context.Exam.VersionId, cancellationToken);
        var index = identifiers.ToList().FindIndex(section => section.Id == sectionId);
        if (index < 0)
            return Result<StudentSingleSectionResponse, StudentExamError>.Failure(StudentExamError.SectionNotFound);
        return await BuildSingleSectionAsync(context, identifiers, index, includeSolutions, cancellationToken);
    }

    private async Task<Result<StudentSingleSectionResponse, StudentExamError>> BuildSingleSectionAsync(
        ExamContext context, IReadOnlyList<StudentSectionIdentifierModel> sections, int index, bool includeSolutions,
        CancellationToken cancellationToken)
    {
        var selected = await _query.GetSectionAsync(context.Exam.VersionId, sections[index].Id, cancellationToken);
        if (selected is null)
            return Result<StudentSingleSectionResponse, StudentExamError>.Failure(StudentExamError.SectionNotFound);
        var content = await LoadContentAsync([selected], includeSolutions, cancellationToken);
        var navigation = new StudentSectionNavigationResponse(index + 1, sections.Count,
            index == 0 ? null : sections[index - 1].Id,
            index == sections.Count - 1 ? null : sections[index + 1].Id);
        return Result<StudentSingleSectionResponse, StudentExamError>.Success(new StudentSingleSectionResponse(
            context.Detail, ToVersionResponse(context.Exam), includeSolutions, content[0], navigation));
    }

    private async Task<ExamContext?> LoadContextAsync(string idOrSlug, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(idOrSlug)) return null;
        var normalized = Guid.TryParse(idOrSlug, out _) ? idOrSlug : TextNormalizer.NormalizeSlug(idOrSlug);
        var exam = await _query.GetPublishedExamAsync(normalized, cancellationToken);
        if (exam is null) return null;
        var tags = await _query.GetActiveTagsAsync(exam.ExamId, cancellationToken);
        return new ExamContext(exam, new StudentExamDetailResponse(
            exam.ExamId, exam.ExamTitle, exam.ExamSlug, exam.ExamDescription, exam.ExamType,
            tags.Select(ToTagResponse).ToList(), exam.ExamCreatedAtUtc, exam.ExamUpdatedAtUtc));
    }

    private async Task<IReadOnlyList<StudentExamSectionContentResponse>> LoadContentAsync(
        IReadOnlyList<StudentSectionModel> sections, bool includeSolutions, CancellationToken cancellationToken)
    {
        if (sections.Count == 0) return [];
        var sectionIds = sections.Select(section => section.Id).ToList();
        var questions = await _query.GetQuestionsAsync(sectionIds, includeSolutions, cancellationToken);
        var questionIds = questions.Select(question => question.Id).ToList();
        var options = await _query.GetOptionsAsync(questionIds, cancellationToken);
        var optionSolutions = includeSolutions
            ? await _query.GetOptionSolutionsAsync(questionIds, cancellationToken)
            : [];
        var fillAnswers = includeSolutions
            ? await _query.GetFillAnswersAsync(questionIds, cancellationToken)
            : [];

        var optionsByQuestion = options.GroupBy(option => option.QuestionId).ToDictionary(group => group.Key, group => group.ToList());
        var solutionByOption = optionSolutions.ToDictionary(solution => solution.OptionId);
        var answersByQuestion = fillAnswers.GroupBy(answer => answer.QuestionId).ToDictionary(group => group.Key, group => group.ToList());
        var childrenByParent = questions.Where(question => question.ParentQuestionId.HasValue)
            .GroupBy(question => question.ParentQuestionId!.Value).ToDictionary(group => group.Key, group => group.ToList());

        StudentQuestionResponse MapQuestion(StudentQuestionModel question)
        {
            var safeOptions = optionsByQuestion.GetValueOrDefault(question.Id, []);
            var childQuestions = childrenByParent.GetValueOrDefault(question.Id, []);
            StudentQuestionSolutionResponse? solution = null;
            if (includeSolutions)
            {
                solution = new StudentQuestionSolutionResponse(
                    question.Explanation,
                    safeOptions.Select(option => solutionByOption.TryGetValue(option.Id, out var item)
                        ? new StudentQuestionOptionSolutionResponse(item.OptionId, item.IsCorrect, item.Explanation)
                        : new StudentQuestionOptionSolutionResponse(option.Id, false, null)).ToList(),
                    answersByQuestion.GetValueOrDefault(question.Id, []).Select(answer =>
                        new StudentFillAnswerSolutionResponse(answer.BlankKey, answer.AcceptedAnswer,
                            answer.IsCaseSensitive, answer.DisplayOrder)).ToList());
            }
            return new StudentQuestionResponse(
                question.Id, question.ParentQuestionId, question.Type, question.Prompt, question.Points,
                question.DisplayOrder, ParseMetadata(question.MetadataJson),
                safeOptions.Select(option => new StudentQuestionOptionResponse(
                    option.Id, option.Label, option.Text, option.DisplayOrder)).ToList(),
                childQuestions.Select(MapQuestion).ToList(), solution);
        }

        return sections.Select(section => new StudentExamSectionContentResponse(
            section.Id, section.Kind, section.Title, section.Instructions, section.StimulusText,
            section.MediaUrl, section.DisplayOrder, section.QuestionCount, section.TotalPoints,
            ParseMetadata(section.MetadataJson),
            questions.Where(question => question.ExamSectionId == section.Id && question.ParentQuestionId is null)
                .Select(MapQuestion).ToList())).ToList();
    }

    private static JsonElement? ParseMetadata(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var document = JsonDocument.Parse(json);
            return document.RootElement.Clone();
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static StudentExamListItemResponse ToListResponse(StudentExamListModel exam) => new(
        exam.Id, exam.Title, exam.Slug, exam.Description, exam.Type,
        exam.Tags.Select(ToTagResponse).ToList(),
        new StudentPublishedVersionSummaryResponse(
            exam.PublishedVersion.Id, exam.PublishedVersion.VersionNumber, exam.PublishedVersion.Title,
            exam.PublishedVersion.DurationMinutes, exam.PublishedVersion.TotalScore,
            exam.PublishedVersion.SectionCount, exam.PublishedVersion.QuestionCount,
            exam.PublishedVersion.PublishedAtUtc), exam.CreatedAtUtc, exam.UpdatedAtUtc);

    private static StudentExamTagSummaryResponse ToTagResponse(StudentExamTagModel tag) =>
        new(tag.Id, tag.Name, tag.Slug, tag.Type);

    private static StudentPublishedVersionResponse ToVersionResponse(StudentPublishedExamModel exam) => new(
        exam.VersionId, exam.VersionNumber, exam.VersionTitle, exam.VersionDescription,
        exam.VersionInstructions, exam.DurationMinutes, exam.TotalScore, exam.ContentRevision, exam.PublishedAtUtc);

    private static StudentExamSectionSummaryResponse ToSectionSummary(StudentSectionModel section) => new(
        section.Id, section.Kind, section.Title, section.Instructions, section.StimulusText,
        section.MediaUrl, section.DisplayOrder, section.QuestionCount, section.TotalPoints,
        ParseMetadata(section.MetadataJson));

    private sealed record ExamContext(StudentPublishedExamModel Exam, StudentExamDetailResponse Detail);
}