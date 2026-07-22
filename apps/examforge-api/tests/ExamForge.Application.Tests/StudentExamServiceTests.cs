using System.Text.Json;

using ExamForge.Application.Student.Exams.Abstractions;
using ExamForge.Application.Student.Exams.Dtos;
using ExamForge.Application.Student.Exams.Enums;
using ExamForge.Application.Student.Exams.Errors;
using ExamForge.Application.Student.Exams.Models;
using ExamForge.Application.Student.Exams.Services;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class StudentExamServiceTests
{
    [Theory]
    [InlineData(0, 20, StudentExamSortOrder.Newest, StudentExamError.InvalidPage)]
    [InlineData(1, 0, StudentExamSortOrder.Newest, StudentExamError.InvalidPageSize)]
    [InlineData(1, 101, StudentExamSortOrder.Newest, StudentExamError.InvalidPageSize)]
    [InlineData(1, 20, (StudentExamSortOrder)99, StudentExamError.InvalidSort)]
    public async Task GetPage_RejectsInvalidPaginationAndSort(
        int page, int pageSize, StudentExamSortOrder sort, StudentExamError expected)
    {
        var result = await new StudentExamService(new FakeQuery()).GetPageAsync(
            new GetStudentExamsRequest(Page: page, PageSize: pageSize, Sort: sort));

        Assert.False(result.IsSuccess);
        Assert.Equal(expected, result.Error);
    }

    [Theory]
    [MemberData(nameof(InvalidTagSelectors))]
    public async Task GetPage_RejectsInvalidTagSelectors(GetStudentExamsRequest request)
    {
        var result = await new StudentExamService(new FakeQuery()).GetPageAsync(request);
        Assert.Equal(StudentExamError.InvalidTagSelector, result.Error);
    }

    public static TheoryData<GetStudentExamsRequest> InvalidTagSelectors => new()
    {
        new(TagSlug: "topic"),
        new(TagType: ExamTagType.Topic),
        new(TagId: Guid.NewGuid(), TagSlug: "topic", TagType: ExamTagType.Topic),
        new(TagSlug: " ", TagType: ExamTagType.Topic),
        new(TagSlug: "topic", TagType: ExamTagType.Unknown)
    };

    [Fact]
    public async Task GetPage_TagSelectorTakesPriorityAndNormalizesSlug()
    {
        var query = new FakeQuery();
        var service = new StudentExamService(query);
        var result = await service.GetPageAsync(new GetStudentExamsRequest(
            TagType: ExamTagType.Topic, TagSlug: "  Dot Net  ",
            CategoryId: Guid.NewGuid(), CategorySlug: "invalid ignored"));

        Assert.True(result.IsSuccess);
        Assert.Equal("dot-net", query.PageRequest!.TagSlug);
        Assert.Null(query.PageRequest.CategoryId);
        Assert.Null(query.PageRequest.CategorySlug);
    }

    [Fact]
    public async Task GetPage_WhitespaceSearchIsIgnoredAndMetadataIsCorrect()
    {
        var query = new FakeQuery { Page = new StudentExamPageModel([], 0) };
        var result = await new StudentExamService(query).GetPageAsync(
            new GetStudentExamsRequest(Page: 2, PageSize: 10, Search: " \t "));

        Assert.True(result.IsSuccess);
        Assert.Null(query.PageRequest!.Search);
        Assert.Equal(0, result.Value!.Meta.TotalPages);
        Assert.False(result.Value.Meta.HasPreviousPage);
        Assert.False(result.Value.Meta.HasNextPage);
    }

    [Fact]
    public async Task GetPage_MapsItemsAndCalculatesNonEmptyCollectionMetadata()
    {
        var fixture = FakeQuery.WithPublishedContent();
        var exam = fixture.Exam!;
        fixture.Page = new StudentExamPageModel(
            [new StudentExamListModel(exam.ExamId, exam.ExamTitle, exam.ExamSlug, exam.ExamDescription,
                exam.ExamType, exam.ExamCreatedAtUtc, exam.ExamUpdatedAtUtc,
                new StudentPublishedVersionSummaryModel(exam.VersionId, exam.VersionNumber,
                    exam.VersionTitle, exam.DurationMinutes, exam.TotalScore, 3, 7, exam.PublishedAtUtc), [])], 25);

        var result = await new StudentExamService(fixture).GetPageAsync(
            new GetStudentExamsRequest(Page: 2, PageSize: 10));

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value!.Items);
        Assert.Equal(3, result.Value.Meta.TotalPages);
        Assert.True(result.Value.Meta.HasPreviousPage);
        Assert.True(result.Value.Meta.HasNextPage);
    }

    [Fact]
    public async Task Summary_NormalizesSlug_OrdersSectionsFromQuery_AndContainsNoQuestionContract()
    {
        var fixture = FakeQuery.WithPublishedContent();
        var second = fixture.Sections[0] with { Id = Guid.NewGuid(), DisplayOrder = 2 };
        fixture.Sections.Add(second);
        var result = await new StudentExamService(fixture).GetSummaryAsync("  Sample Exam ");

        Assert.True(result.IsSuccess);
        Assert.Equal("sample-exam", fixture.LastLookup);
        Assert.Equal([1, 2], result.Value!.Sections.Select(section => section.DisplayOrder));
        Assert.DoesNotContain("Question", string.Join(',', typeof(StudentExamSummaryResponse).GetProperties().Select(item => item.Name)));
    }

    [Fact]
    public async Task Summary_ReturnsGenericNotFoundWhenPublishedExamIsUnavailable()
    {
        var result = await new StudentExamService(new FakeQuery()).GetSummaryAsync(Guid.NewGuid().ToString());
        Assert.Equal(StudentExamError.PublishedExamNotFound, result.Error);
    }

    [Fact]
    public async Task FullTest_NestsChildren_HandlesInvalidMetadata_AndDoesNotLoadSolutionsByDefault()
    {
        var fixture = FakeQuery.WithPublishedContent();
        var result = await new StudentExamService(fixture).GetFullTestAsync("Sample Exam", false);

        Assert.True(result.IsSuccess);
        var response = result.Value!;
        Assert.False(response.SolutionsIncluded);
        Assert.Null(response.Sections[0].Metadata);
        Assert.Single(response.Sections[0].Questions);
        Assert.Single(response.Sections[0].Questions[0].ChildQuestions);
        Assert.Null(response.Sections[0].Questions[0].ChildQuestions[0].Metadata);
        Assert.Equal(0, fixture.OptionSolutionCalls);
        Assert.Equal(0, fixture.FillAnswerCalls);
        Assert.False(fixture.LastIncludeSolutions);

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.DoesNotContain("\"solution\"", json, StringComparison.Ordinal);
        Assert.DoesNotContain("isCorrect", json, StringComparison.Ordinal);
        Assert.DoesNotContain("acceptedAnswer", json, StringComparison.Ordinal);
        Assert.DoesNotContain("explanation", json, StringComparison.Ordinal);
    }

    [Fact]
    public async Task FullTest_IncludesRecursiveOptionAndFillSolutionsWhenRequested()
    {
        var fixture = FakeQuery.WithPublishedContent();
        var result = await new StudentExamService(fixture).GetFullTestAsync(fixture.Exam!.ExamId.ToString(), true);

        Assert.True(result.IsSuccess);
        var child = result.Value!.Sections[0].Questions[0].ChildQuestions[0];
        Assert.True(result.Value.SolutionsIncluded);
        Assert.Equal("Child explanation", child.Solution!.Explanation);
        Assert.True(child.Solution.Options[0].IsCorrect);
        Assert.Equal("Because A", child.Solution.Options[0].Explanation);
        Assert.Equal("answer", child.Solution.AcceptedAnswers[0].AcceptedAnswer);
        Assert.Equal(1, fixture.OptionSolutionCalls);
        Assert.Equal(1, fixture.FillAnswerCalls);
    }

    [Fact]
    public async Task Section_UsesDeterministicNavigationAndLoadsOnlySelectedContent()
    {
        var fixture = FakeQuery.WithPublishedContent();
        var first = fixture.Sections[0];
        var second = first with { Id = Guid.NewGuid(), DisplayOrder = 2, Title = "Second" };
        var third = first with { Id = Guid.NewGuid(), DisplayOrder = 3, Title = "Third" };
        fixture.Sections = [first, second, third];
        var result = await new StudentExamService(fixture).GetSectionAsync("sample-exam", second.Id, false);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.Navigation.Position);
        Assert.Equal(3, result.Value.Navigation.TotalSections);
        Assert.Equal(first.Id, result.Value.Navigation.PreviousSectionId);
        Assert.Equal(third.Id, result.Value.Navigation.NextSectionId);
        Assert.Equal([second.Id], fixture.LastQuestionSectionIds);
    }

    [Fact]
    public async Task FirstSection_ReturnsNotFoundWhenPublishedVersionHasNoSections()
    {
        var fixture = FakeQuery.WithPublishedContent();
        fixture.Sections = [];
        var result = await new StudentExamService(fixture).GetFirstSectionAsync("sample-exam", false);
        Assert.Equal(StudentExamError.SectionNotFound, result.Error);
    }

    private sealed class FakeQuery : IStudentExamQuery
    {
        public StudentExamPageModel Page { get; set; } = new([], 0);
        public StudentExamPageQuery? PageRequest { get; private set; }
        public StudentPublishedExamModel? Exam { get; set; }
        public List<StudentSectionModel> Sections { get; set; } = [];
        public List<StudentQuestionModel> Questions { get; set; } = [];
        public List<StudentOptionModel> Options { get; set; } = [];
        public List<StudentOptionSolutionModel> OptionSolutions { get; set; } = [];
        public List<StudentFillAnswerModel> Answers { get; set; } = [];
        public int OptionSolutionCalls { get; private set; }
        public int FillAnswerCalls { get; private set; }
        public bool LastIncludeSolutions { get; private set; }
        public IReadOnlyCollection<Guid> LastQuestionSectionIds { get; private set; } = [];
        public string? LastLookup { get; private set; }

        public Task<StudentExamPageModel> GetPageAsync(StudentExamPageQuery request, CancellationToken cancellationToken = default)
        { PageRequest = request; return Task.FromResult(Page); }
        public Task<StudentPublishedExamModel?> GetPublishedExamAsync(string idOrSlug, CancellationToken cancellationToken = default)
        { LastLookup = idOrSlug; return Task.FromResult(Exam); }
        public Task<IReadOnlyList<StudentExamTagModel>> GetActiveTagsAsync(Guid examId, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<StudentExamTagModel>>([]);
        public Task<IReadOnlyList<StudentSectionModel>> GetSectionsAsync(Guid versionId, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<StudentSectionModel>>(Sections);
        public Task<IReadOnlyList<StudentSectionIdentifierModel>> GetSectionIdentifiersAsync(Guid versionId, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<StudentSectionIdentifierModel>>(Sections.Select(section => new StudentSectionIdentifierModel(section.Id, section.DisplayOrder)).ToList());
        public Task<StudentSectionModel?> GetSectionAsync(Guid versionId, Guid sectionId, CancellationToken cancellationToken = default) => Task.FromResult(Sections.SingleOrDefault(section => section.Id == sectionId));
        public Task<IReadOnlyList<StudentQuestionModel>> GetQuestionsAsync(IReadOnlyCollection<Guid> sectionIds, bool includeSolutions, CancellationToken cancellationToken = default)
        { LastQuestionSectionIds = sectionIds; LastIncludeSolutions = includeSolutions; return Task.FromResult<IReadOnlyList<StudentQuestionModel>>(Questions.Where(question => sectionIds.Contains(question.ExamSectionId)).ToList()); }
        public Task<IReadOnlyList<StudentOptionModel>> GetOptionsAsync(IReadOnlyCollection<Guid> questionIds, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<StudentOptionModel>>(Options.Where(option => questionIds.Contains(option.QuestionId)).ToList());
        public Task<IReadOnlyList<StudentOptionSolutionModel>> GetOptionSolutionsAsync(IReadOnlyCollection<Guid> questionIds, CancellationToken cancellationToken = default)
        { OptionSolutionCalls++; return Task.FromResult<IReadOnlyList<StudentOptionSolutionModel>>(OptionSolutions.Where(item => questionIds.Contains(Options.Single(option => option.Id == item.OptionId).QuestionId)).ToList()); }
        public Task<IReadOnlyList<StudentFillAnswerModel>> GetFillAnswersAsync(IReadOnlyCollection<Guid> questionIds, CancellationToken cancellationToken = default)
        { FillAnswerCalls++; return Task.FromResult<IReadOnlyList<StudentFillAnswerModel>>(Answers.Where(item => questionIds.Contains(item.QuestionId)).ToList()); }

        public static FakeQuery WithPublishedContent()
        {
            var examId = Guid.NewGuid(); var versionId = Guid.NewGuid(); var sectionId = Guid.NewGuid();
            var groupId = Guid.NewGuid(); var childId = Guid.NewGuid(); var optionId = Guid.NewGuid();
            return new FakeQuery
            {
                Exam = new StudentPublishedExamModel(examId, "Sample Exam", "sample-exam", "Description", ExamType.Simple,
                    DateTimeOffset.UtcNow, null, versionId, 1, "Published", "Description", "Instructions", 60, 10, 3, DateTimeOffset.UtcNow),
                Sections = [new StudentSectionModel(sectionId, ExamSectionKind.Reading, "Section", "", null, null, 1, 1, 10, "not-json")],
                Questions =
                [
                    new StudentQuestionModel(groupId, sectionId, null, QuestionType.Group, "Group", "Group explanation", 0, 1, "{}"),
                    new StudentQuestionModel(childId, sectionId, groupId, QuestionType.MultipleChoiceSingle, "Child", "Child explanation", 10, 1, "invalid")
                ],
                Options = [new StudentOptionModel(optionId, childId, "A", "Option A", 1)],
                OptionSolutions = [new StudentOptionSolutionModel(optionId, true, "Because A")],
                Answers = [new StudentFillAnswerModel(childId, "blank", "answer", false, 1, Guid.NewGuid())]
            };
        }
    }
}