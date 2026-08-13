using ExamForge.Application.Student.ExamClassifications.Abstractions;
using ExamForge.Application.Student.ExamClassifications.Models;
using ExamForge.Application.Student.Exams.Abstractions;
using ExamForge.Application.Student.Exams.Dtos;
using ExamForge.Application.Student.Exams.Enums;
using ExamForge.Application.Student.Exams.Errors;
using ExamForge.Application.Student.Exams.Models;
using ExamForge.Application.Student.Exams.Services;
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
        var result = await CreateService(new FakeQuery()).GetPageAsync(
            new GetStudentExamsRequest(Page: page, PageSize: pageSize, Sort: sort));

        Assert.False(result.IsSuccess);
        Assert.Equal(expected, result.Error);
    }

    [Fact]
    public async Task GetPage_RejectsMoreThanTwentyRawTagValuesWithoutQueryingDiscovery()
    {
        var discovery = new FakeDiscoveryQuery();
        var ids = Enumerable.Range(0, 21).Select(_ => Guid.NewGuid()).ToList();

        var result = await CreateService(new FakeQuery(), discovery).GetPageAsync(
            new GetStudentExamsRequest(TagIds: ids));

        Assert.Equal(StudentExamError.TooManyTagValues, result.Error);
        Assert.Equal(0, discovery.ActiveTagCalls);
    }

    [Fact]
    public async Task GetPage_DeduplicatesTagsAndComposesThemWithNormalizedCategory()
    {
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();
        var category = new StudentExamCategoryRuleModel(
            ExamForge.Domain.ExamClassifications.ExamCategoryMatchMode.All,
            [second]);
        var query = new FakeQuery();
        var discovery = new FakeDiscoveryQuery { Category = category };

        var result = await CreateService(query, discovery).GetPageAsync(
            new GetStudentExamsRequest(
                TagIds: [first, first, second],
                CategorySlug: "  Data Science  "));

        Assert.True(result.IsSuccess);
        Assert.Equal([first, second], query.PageRequest!.TagIds);
        Assert.Same(category, query.PageRequest.Category);
        Assert.Equal("data-science", discovery.LastCategorySlug);
    }

    [Fact]
    public async Task GetPage_ReturnsInvalidTagIdsWithMissingOrArchivedIds()
    {
        var active = Guid.NewGuid();
        var invalid = Guid.NewGuid();
        var discovery = new FakeDiscoveryQuery { ActiveTagIds = [active] };

        var result = await CreateService(new FakeQuery(), discovery).GetPageAsync(
            new GetStudentExamsRequest(TagIds: [active, invalid]));

        Assert.Equal(StudentExamError.InvalidTagIds, result.Error);
        Assert.Equal([invalid], Assert.IsAssignableFrom<IReadOnlyCollection<Guid>>(
            result.AdditionalData));
    }

    [Fact]
    public async Task GetPage_ReturnsNotFoundForNonDiscoverableCategory()
    {
        var result = await CreateService(new FakeQuery()).GetPageAsync(
            new GetStudentExamsRequest(CategorySlug: "missing"));

        Assert.Equal(StudentExamError.CategoryNotFound, result.Error);
    }

    [Fact]
    public async Task GetPage_ValidCategoryWithNoMatchingExams_ReturnsEmptyCollection()
    {
        var discovery = new FakeDiscoveryQuery
        {
            Category = new StudentExamCategoryRuleModel(
                ExamForge.Domain.ExamClassifications.ExamCategoryMatchMode.All,
                [Guid.NewGuid()])
        };

        var result = await CreateService(
            new FakeQuery { Page = new StudentExamPageModel([], 0) },
            discovery).GetPageAsync(
            new GetStudentExamsRequest(CategorySlug: "empty-results"));

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!.Items);
        Assert.Equal(0, result.Value.Meta.TotalItems);
    }

    [Fact]
    public async Task GetPage_RejectsWhitespaceCategory()
    {
        var result = await CreateService(new FakeQuery()).GetPageAsync(
            new GetStudentExamsRequest(CategorySlug: " "));

        Assert.Equal(StudentExamError.InvalidCategorySelector, result.Error);
    }

    [Fact]
    public async Task GetPage_WhitespaceSearchIsIgnoredAndMetadataIsCorrect()
    {
        var query = new FakeQuery { Page = new StudentExamPageModel([], 0) };
        var result = await CreateService(query).GetPageAsync(
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

        var result = await CreateService(fixture).GetPageAsync(
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
        var result = await CreateService(fixture).GetSummaryAsync("  Sample Exam ");

        Assert.True(result.IsSuccess);
        Assert.Equal("sample-exam", fixture.LastLookup);
        Assert.Equal([1, 2], result.Value!.Sections.Select(section => section.DisplayOrder));
        Assert.DoesNotContain("Question", string.Join(',', typeof(StudentExamSummaryResponse).GetProperties().Select(item => item.Name)));
    }

    [Fact]
    public async Task Summary_ReturnsGenericNotFoundWhenPublishedExamIsUnavailable()
    {
        var result = await CreateService(new FakeQuery()).GetSummaryAsync(Guid.NewGuid().ToString());
        Assert.Equal(StudentExamError.PublishedExamNotFound, result.Error);
    }

    private static StudentExamService CreateService(
        FakeQuery query,
        FakeDiscoveryQuery? discovery = null) =>
        new(query, discovery ?? new FakeDiscoveryQuery());

    private sealed class FakeDiscoveryQuery : IStudentExamDiscoveryQuery
    {
        public IReadOnlyCollection<Guid>? ActiveTagIds { get; set; }
        public StudentExamCategoryRuleModel? Category { get; set; }
        public int ActiveTagCalls { get; private set; }
        public string? LastCategorySlug { get; private set; }

        public Task<IReadOnlyList<StudentExamFilterTagModel>> GetFilterTagsAsync(
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<StudentExamFilterTagModel>>([]);

        public Task<IReadOnlyList<StudentExamCategoryModel>> GetCategoriesAsync(
            bool featuredOnly,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<StudentExamCategoryModel>>([]);

        public Task<StudentExamCategoryRuleModel?> GetCategoryRuleBySlugAsync(
            string slug,
            CancellationToken cancellationToken = default)
        {
            LastCategorySlug = slug;
            return Task.FromResult(Category);
        }

        public Task<IReadOnlyCollection<Guid>> GetActiveTagIdsAsync(
            IReadOnlyCollection<Guid> tagIds,
            CancellationToken cancellationToken = default)
        {
            ActiveTagCalls++;
            return Task.FromResult(ActiveTagIds ?? tagIds);
        }
    }

    private sealed class FakeQuery : IStudentExamQuery
    {
        public StudentExamPageModel Page { get; set; } = new([], 0);
        public StudentExamPageQuery? PageRequest { get; private set; }
        public StudentPublishedExamModel? Exam { get; set; }
        public List<StudentSectionModel> Sections { get; set; } = [];
        public string? LastLookup { get; private set; }

        public Task<StudentExamPageModel> GetPageAsync(StudentExamPageQuery request, CancellationToken cancellationToken = default)
        { PageRequest = request; return Task.FromResult(Page); }
        public Task<StudentPublishedExamModel?> GetPublishedExamAsync(string idOrSlug, CancellationToken cancellationToken = default)
        { LastLookup = idOrSlug; return Task.FromResult(Exam); }
        public Task<IReadOnlyList<StudentExamTagModel>> GetActiveTagsAsync(Guid examId, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<StudentExamTagModel>>([]);
        public Task<IReadOnlyList<StudentSectionModel>> GetSectionsAsync(Guid versionId, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<StudentSectionModel>>(Sections);
        public static FakeQuery WithPublishedContent()
        {
            var examId = Guid.NewGuid(); var versionId = Guid.NewGuid(); var sectionId = Guid.NewGuid();
            return new FakeQuery
            {
                Exam = new StudentPublishedExamModel(examId, "Sample Exam", "sample-exam", "Description", ExamType.Simple,
                    DateTimeOffset.UtcNow, null, versionId, 1, "Published", "Description", "Instructions", 60, 10, 3, DateTimeOffset.UtcNow),
                Sections = [new StudentSectionModel(sectionId, ExamSectionKind.Reading, "Section", "", null, null, 1, 1, 10, "not-json")]
            };
        }
    }
}
