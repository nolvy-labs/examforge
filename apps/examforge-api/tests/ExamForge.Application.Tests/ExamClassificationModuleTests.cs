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
    public async Task StudentExamTagService_UsesOnlyActiveQueryOperations()
    {
        var tag = new StudentExamTagModel(
            Guid.NewGuid(),
            "Algorithms",
            "algorithms",
            "Algorithm practice",
            ExamTagType.Topic,
            DateTimeOffset.UtcNow,
            null);
        var query = new RecordingStudentExamTagQuery(tag);
        var service = new StudentExamTagService(query);

        await service.ListActiveAsync(ExamTagType.Topic);
        await service.GetActiveByIdAsync(tag.Id);
        await service.GetActiveByTypeAndSlugAsync(tag.Type, tag.Slug);

        Assert.Equal(1, query.ListActiveCalls);
        Assert.Equal(1, query.GetActiveByIdCalls);
        Assert.Equal(1, query.GetActiveByTypeAndSlugCalls);
    }

    [Fact]
    public async Task StudentExamCategoryService_UsesOnlyActiveQueryOperations()
    {
        var category = new StudentExamCategoryModel(
            Guid.NewGuid(),
            "Backend",
            "backend",
            "Backend exams",
            ExamCategoryMatchMode.All,
            true,
            1,
            DateTimeOffset.UtcNow,
            null,
            []);
        var query = new RecordingStudentExamCategoryQuery(category);
        var service = new StudentExamCategoryService(query);

        await service.ListActiveAsync();
        await service.GetActiveByIdOrSlugAsync(category.Slug);

        Assert.Equal(1, query.ListActiveCalls);
        Assert.Equal(1, query.GetActiveByIdOrSlugCalls);
    }

    [Theory]
    [InlineData(typeof(StudentExamTagService))]
    [InlineData(typeof(StudentExamCategoryService))]
    public void StudentClassificationServices_DoNotExposeVisibilityBooleans(Type serviceType)
    {
        var publicParameters = serviceType
            .GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly)
            .SelectMany(method => method.GetParameters())
            .ToList();

        Assert.DoesNotContain(publicParameters, parameter => parameter.ParameterType == typeof(bool));
        Assert.DoesNotContain(publicParameters, parameter =>
            parameter.Name?.Contains("archived", StringComparison.OrdinalIgnoreCase) == true);
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

    private sealed class RecordingStudentExamTagQuery : IStudentExamTagQuery
    {
        private readonly StudentExamTagModel _tag;

        public RecordingStudentExamTagQuery(StudentExamTagModel tag)
        {
            _tag = tag;
        }

        public int ListActiveCalls { get; private set; }
        public int GetActiveByIdCalls { get; private set; }
        public int GetActiveByTypeAndSlugCalls { get; private set; }

        public Task<IReadOnlyList<StudentExamTagModel>> ListActiveAsync(
            ExamTagType? type,
            CancellationToken cancellationToken = default)
        {
            ListActiveCalls++;
            return Task.FromResult<IReadOnlyList<StudentExamTagModel>>([_tag]);
        }

        public Task<StudentExamTagModel?> GetActiveByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default)
        {
            GetActiveByIdCalls++;
            return Task.FromResult<StudentExamTagModel?>(_tag);
        }

        public Task<StudentExamTagModel?> GetActiveByTypeAndSlugAsync(
            ExamTagType type,
            string slug,
            CancellationToken cancellationToken = default)
        {
            GetActiveByTypeAndSlugCalls++;
            return Task.FromResult<StudentExamTagModel?>(_tag);
        }
    }

    private sealed class RecordingStudentExamCategoryQuery : IStudentExamCategoryQuery
    {
        private readonly StudentExamCategoryModel _category;

        public RecordingStudentExamCategoryQuery(StudentExamCategoryModel category)
        {
            _category = category;
        }

        public int ListActiveCalls { get; private set; }
        public int GetActiveByIdOrSlugCalls { get; private set; }

        public Task<IReadOnlyCollection<StudentExamCategoryModel>> ListActiveAsync(
            CancellationToken cancellationToken = default)
        {
            ListActiveCalls++;
            return Task.FromResult<IReadOnlyCollection<StudentExamCategoryModel>>([_category]);
        }

        public Task<StudentExamCategoryModel?> GetActiveByIdOrSlugAsync(
            string idOrSlug,
            CancellationToken cancellationToken = default)
        {
            GetActiveByIdOrSlugCalls++;
            return Task.FromResult<StudentExamCategoryModel?>(_category);
        }
    }
}
