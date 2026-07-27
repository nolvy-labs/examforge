using System.Reflection;

using ExamForge.Application.Admin.ExamClassifications.Services;
using ExamForge.Application.Student.ExamClassifications.Abstractions;
using ExamForge.Application.Student.ExamClassifications.Models;
using ExamForge.Application.Student.ExamClassifications.Services;
using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Tests;

public sealed class ExamClassificationModuleTests
{
    [Fact]
    public async Task DiscoveryService_GroupsAndOrdersFiltersDeterministically()
    {
        var subject = new StudentExamFilterTagModel(
            Guid.NewGuid(), "Mathematics", "mathematics", ExamTagType.Subject, 3);
        var topicB = new StudentExamFilterTagModel(
            Guid.NewGuid(), "Sorting", "sorting", ExamTagType.Topic, 2);
        var topicA = new StudentExamFilterTagModel(
            Guid.NewGuid(), "Algorithms", "algorithms", ExamTagType.Topic, 1);
        var query = new RecordingDiscoveryQuery
        {
            Filters = [topicB, subject, topicA]
        };

        var response = await new StudentExamDiscoveryService(query).GetFiltersAsync();

        Assert.Equal([ExamTagType.Subject, ExamTagType.Topic],
            response.Groups.Select(group => group.Type));
        Assert.Equal(["Algorithms", "Sorting"],
            response.Groups[1].Items.Select(item => item.Name));
        Assert.Equal([1, 2],
            response.Groups[1].Items.Select(item => item.ExamCount));
    }

    [Fact]
    public async Task DiscoveryService_MapsOnlyStudentSafeCategoryFieldsAndNormalizesSlug()
    {
        var tag = new StudentExamCategoryTagModel(
            Guid.NewGuid(), "Algorithms", "algorithms", ExamTagType.Topic);
        var category = new StudentExamCategoryModel(
            Guid.NewGuid(), "Backend", "backend", "Backend exams", true, 4, [tag]);
        var query = new RecordingDiscoveryQuery
        {
            Categories = [category],
            Category = category
        };
        var service = new StudentExamDiscoveryService(query);

        var categories = await service.GetCategoriesAsync(featuredOnly: true);
        var detail = await service.GetCategoryAsync("  Back End  ");

        Assert.Single(categories);
        Assert.True(query.LastFeaturedOnly);
        Assert.True(detail.IsSuccess);
        Assert.Equal("back-end", query.LastCategorySlug);
        Assert.Equal(category.Id, detail.Value!.Id);
        Assert.Equal(tag.Id, detail.Value.Tags[0].Id);

        var exposedNames = typeof(ExamForge.Application.Student.ExamClassifications.Dtos.StudentExamCategoryResponse)
            .GetProperties()
            .Select(property => property.Name)
            .ToHashSet(StringComparer.Ordinal);
        Assert.DoesNotContain("MatchMode", exposedNames);
        Assert.DoesNotContain("DisplayOrder", exposedNames);
        Assert.DoesNotContain("CreatedAtUtc", exposedNames);
        Assert.DoesNotContain("UpdatedAtUtc", exposedNames);
        Assert.DoesNotContain("IsArchived", exposedNames);
    }

    [Fact]
    public async Task DiscoveryService_ReturnsNotFoundForBlankOrMissingCategory()
    {
        var query = new RecordingDiscoveryQuery();
        var service = new StudentExamDiscoveryService(query);

        var blank = await service.GetCategoryAsync(" ");
        var missing = await service.GetCategoryAsync("missing");

        Assert.False(blank.IsSuccess);
        Assert.False(missing.IsSuccess);
        Assert.Equal(1, query.CategoryLookupCalls);
        Assert.Equal("missing", query.LastCategorySlug);
    }

    [Theory]
    [MemberData(nameof(AdminManagementServiceMethods))]
    public void AdminClassificationServices_RetainManagementOperations(
        Type serviceType,
        string[] expectedMethods)
    {
        var actualMethods = serviceType
            .GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly)
            .Select(method => method.Name)
            .ToHashSet(StringComparer.Ordinal);

        Assert.All(expectedMethods, method => Assert.Contains(method, actualMethods));
    }

    public static TheoryData<Type, string[]> AdminManagementServiceMethods => new()
    {
        {
            typeof(AdminExamTagService),
            ["ListAsync", "GetByIdAsync", "CreateAsync", "UpdateAsync", "ArchiveAsync", "RestoreAsync"]
        },
        {
            typeof(AdminExamCategoryService),
            ["ListAsync", "GetByIdAsync", "CreateAsync", "UpdateAsync", "ArchiveAsync", "RestoreAsync"]
        }
    };

    private sealed class RecordingDiscoveryQuery : IStudentExamDiscoveryQuery
    {
        public IReadOnlyList<StudentExamFilterTagModel> Filters { get; set; } = [];
        public IReadOnlyList<StudentExamCategoryModel> Categories { get; set; } = [];
        public StudentExamCategoryModel? Category { get; set; }
        public bool LastFeaturedOnly { get; private set; }
        public string? LastCategorySlug { get; private set; }
        public int CategoryLookupCalls { get; private set; }

        public Task<IReadOnlyList<StudentExamFilterTagModel>> GetFilterTagsAsync(
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Filters);

        public Task<IReadOnlyList<StudentExamCategoryModel>> GetCategoriesAsync(
            bool featuredOnly,
            CancellationToken cancellationToken = default)
        {
            LastFeaturedOnly = featuredOnly;
            return Task.FromResult(Categories);
        }

        public Task<StudentExamCategoryModel?> GetCategoryBySlugAsync(
            string slug,
            CancellationToken cancellationToken = default)
        {
            CategoryLookupCalls++;
            LastCategorySlug = slug;
            return Task.FromResult(Category);
        }

        public Task<StudentExamCategoryRuleModel?> GetCategoryRuleBySlugAsync(
            string slug,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<StudentExamCategoryRuleModel?>(null);

        public Task<IReadOnlyCollection<Guid>> GetActiveTagIdsAsync(
            IReadOnlyCollection<Guid> tagIds,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(tagIds);
    }
}