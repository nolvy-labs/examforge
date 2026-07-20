using System.Text.Json;

using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.ExamClassifications.Abstractions;
using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Application.Admin.Exams.Services;
using ExamForge.Application.Admin.Exams.Utils;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class ExamServiceTests
{
    [Fact]
    public async Task Create_normalizes_values_and_converts_null_description_to_empty()
    {
        var context = CreateContext("normalized-title-12345678");

        var result = await context.Service.CreateAsync(
            new CreateExamRequest(
                new CreateExamDetail("  Practice   Exam  ", null, ExamType.Simple),
                []));

        Assert.True(result.IsSuccess);
        Assert.Equal("Practice Exam", result.Value!.Title);
        Assert.Equal(string.Empty, result.Value.Description);
        Assert.Equal("normalized-title-12345678", result.Value.Slug);
    }

    [Fact]
    public async Task Create_rejects_duplicate_tag_ids()
    {
        var tag = CreateTag();
        var context = CreateContext(tags: [tag]);

        var result = await context.Service.CreateAsync(CreateRequest([tag.Id, tag.Id]));

        Assert.Equal(ExamError.DuplicateTagIds, result.Error);
    }

    [Fact]
    public async Task Create_reports_missing_or_archived_tag_ids()
    {
        var archivedTag = CreateTag(archived: true);
        var missingId = Guid.NewGuid();
        var context = CreateContext(tags: [archivedTag]);

        var result = await context.Service.CreateAsync(
            CreateRequest([archivedTag.Id, missingId]));

        Assert.Equal(ExamError.MissingOrArchivedTagIds, result.Error);
        Assert.True(result.TryGetAdditionalData<IReadOnlyCollection<Guid>>(out var ids));
        Assert.Contains(archivedTag.Id, ids);
        Assert.Contains(missingId, ids);
    }

    [Fact]
    public async Task Create_rejects_more_than_twenty_tags()
    {
        var tags = Enumerable.Range(0, ExamConstraints.MaxTags + 1)
            .Select(_ => CreateTag())
            .ToList();
        var context = CreateContext(tags: tags);

        var result = await context.Service.CreateAsync(
            CreateRequest(tags.Select(tag => tag.Id).ToList()));

        Assert.Equal(ExamError.TooManyTags, result.Error);
    }

    [Fact]
    public async Task Create_uses_slug_candidate_from_generator()
    {
        var context = CreateContext("expected-slug-12345678");

        var result = await context.Service.CreateAsync(CreateRequest([]));

        Assert.True(result.IsSuccess);
        Assert.Equal("expected-slug-12345678", result.Value!.Slug);
        Assert.Equal(["Exam title"], context.SlugGenerator.Titles);
    }

    [Fact]
    public async Task Update_changes_slug_when_normalized_title_changes()
    {
        var context = CreateContext("new-title-12345678");
        var exam = context.AddExam("Old title", "old-title-12345678");

        var result = await context.Service.UpdateAsync(
            exam.Id,
            UpdateRequest("  New   title  "));

        Assert.True(result.IsSuccess);
        Assert.Equal("New title", result.Value!.Title);
        Assert.Equal("new-title-12345678", result.Value.Slug);
        Assert.Equal(["New title"], context.SlugGenerator.Titles);
    }

    [Fact]
    public async Task Update_preserves_slug_when_only_non_title_values_change()
    {
        var tag = CreateTag();
        var context = CreateContext(tags: [tag]);
        var exam = context.AddExam("Exam title", "original-slug-12345678");

        var result = await context.Service.UpdateAsync(
            exam.Id,
            UpdateRequest(
                "  Exam   title ",
                description: "Changed",
                type: ExamType.Ielts));

        Assert.True(result.IsSuccess);
        Assert.Equal("original-slug-12345678", result.Value!.Slug);
        Assert.Empty(context.SlugGenerator.Titles);
    }

    [Fact]
    public async Task Update_changes_only_title_when_other_details_are_omitted()
    {
        var context = CreateContext("new-title-12345678");
        var exam = context.AddExam(
            title: "Old title",
            slug: "old-title-12345678",
            description: "Original description",
            type: ExamType.Ielts);

        var result = await context.Service.UpdateAsync(
            exam.Id,
            UpdateRequest(title: "New title"));

        Assert.True(result.IsSuccess);
        Assert.Equal("New title", result.Value!.Title);
        Assert.Equal("new-title-12345678", result.Value.Slug);
        Assert.Equal("Original description", result.Value.Description);
        Assert.Equal(ExamType.Ielts, result.Value.Type);
    }

    [Fact]
    public async Task Update_changes_only_description_when_other_details_are_omitted()
    {
        var context = CreateContext();
        var exam = context.AddExam(
            description: "Original description",
            type: ExamType.Ielts);

        var result = await context.Service.UpdateAsync(
            exam.Id,
            UpdateRequest(description: "Changed description"));

        Assert.True(result.IsSuccess);
        Assert.Equal("Exam title", result.Value!.Title);
        Assert.Equal("exam-title-00000000", result.Value.Slug);
        Assert.Equal("Changed description", result.Value.Description);
        Assert.Equal(ExamType.Ielts, result.Value.Type);
        Assert.Empty(context.SlugGenerator.Titles);
    }

    [Fact]
    public async Task Update_changes_only_type_when_other_details_are_omitted()
    {
        var context = CreateContext();
        var exam = context.AddExam(description: "Original description");

        var result = await context.Service.UpdateAsync(
            exam.Id,
            UpdateRequest(type: ExamType.Ielts));

        Assert.True(result.IsSuccess);
        Assert.Equal("Exam title", result.Value!.Title);
        Assert.Equal("exam-title-00000000", result.Value.Slug);
        Assert.Equal("Original description", result.Value.Description);
        Assert.Equal(ExamType.Ielts, result.Value.Type);
        Assert.Empty(context.SlugGenerator.Titles);
    }

    [Fact]
    public async Task Update_allows_tag_only_request_without_exam_detail()
    {
        var tag = CreateTag();
        var context = CreateContext(tags: [tag]);
        var exam = context.AddExam(description: "Original description");

        var result = await context.Service.ReplaceTagsAsync(
            exam.Id,
            new ReplaceExamTagsRequest([tag.Id]));

        Assert.True(result.IsSuccess);
        Assert.Equal("Exam title", result.Value!.Title);
        Assert.Equal("Original description", result.Value.Description);
        Assert.Equal(ExamType.Simple, result.Value.Type);
        Assert.Single(result.Value.Tags);
        Assert.Empty(context.SlugGenerator.Titles);
    }

    [Fact]
    public async Task Replace_tags_rejects_duplicates()
    {
        var tagId = Guid.NewGuid();
        var context = CreateContext();
        var exam = context.AddExam();

        var result = await context.Service.ReplaceTagsAsync(
            exam.Id,
            new ReplaceExamTagsRequest([tagId, tagId]));

        Assert.Equal(ExamError.DuplicateTagIds, result.Error);
    }

    [Fact]
    public async Task Adding_existing_mapping_is_no_op()
    {
        var tag = CreateTag();
        var context = CreateContext(tags: [tag]);
        var exam = context.AddExam(tagIds: [tag.Id]);
        var updatedAt = exam.UpdatedAtUtc;

        var result = await context.Service.ReplaceTagsAsync(
            exam.Id,
            new ReplaceExamTagsRequest([tag.Id]));

        Assert.True(result.IsSuccess);
        Assert.Single(exam.ExamTagMappings);
        Assert.Equal(updatedAt, exam.UpdatedAtUtc);
    }

    [Fact]
    public async Task Removing_absent_mapping_is_no_op()
    {
        var context = CreateContext();
        var exam = context.AddExam();
        var updatedAt = exam.UpdatedAtUtc;

        var result = await context.Service.ReplaceTagsAsync(
            exam.Id,
            new ReplaceExamTagsRequest([]));

        Assert.True(result.IsSuccess);
        Assert.Empty(exam.ExamTagMappings);
        Assert.Equal(updatedAt, exam.UpdatedAtUtc);
    }

    [Fact]
    public async Task Same_update_can_be_executed_twice_safely()
    {
        var tag = CreateTag();
        var context = CreateContext(tags: [tag]);
        var exam = context.AddExam();
        var request = new ReplaceExamTagsRequest([tag.Id]);

        var first = await context.Service.ReplaceTagsAsync(exam.Id, request);
        var updatedAt = exam.UpdatedAtUtc;
        var second = await context.Service.ReplaceTagsAsync(exam.Id, request);

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);
        Assert.Single(exam.ExamTagMappings);
        Assert.Equal(updatedAt, exam.UpdatedAtUtc);
    }

    [Fact]
    public async Task Added_archived_or_missing_tags_are_rejected()
    {
        var archivedTag = CreateTag(archived: true);
        var context = CreateContext(tags: [archivedTag]);
        var exam = context.AddExam();

        var result = await context.Service.ReplaceTagsAsync(
            exam.Id,
            new ReplaceExamTagsRequest([archivedTag.Id, Guid.NewGuid()]));

        Assert.Equal(ExamError.MissingOrArchivedTagIds, result.Error);
    }

    [Fact]
    public async Task Removing_archived_tag_mapping_is_allowed()
    {
        var archivedTag = CreateTag(archived: true);
        var context = CreateContext(tags: [archivedTag]);
        var exam = context.AddExam(tagIds: [archivedTag.Id]);

        var result = await context.Service.ReplaceTagsAsync(
            exam.Id,
            new ReplaceExamTagsRequest([]));

        Assert.True(result.IsSuccess);
        Assert.Empty(exam.ExamTagMappings);
    }

    [Fact]
    public async Task Archive_and_restore_are_idempotent()
    {
        var context = CreateContext();
        var exam = context.AddExam();

        Assert.Equal(ExamError.None, await context.Service.ArchiveAsync(exam.Id));
        var archivedAt = exam.UpdatedAtUtc;
        Assert.Equal(ExamError.None, await context.Service.ArchiveAsync(exam.Id));
        Assert.True(exam.IsArchived);
        Assert.Equal(archivedAt, exam.UpdatedAtUtc);

        Assert.Equal(ExamError.None, await context.Service.RestoreAsync(exam.Id));
        var restoredAt = exam.UpdatedAtUtc;
        Assert.Equal(ExamError.None, await context.Service.RestoreAsync(exam.Id));
        Assert.False(exam.IsArchived);
        Assert.Equal(restoredAt, exam.UpdatedAtUtc);
    }

    [Fact]
    public async Task Offset_metadata_calculates_page_values()
    {
        var context = CreateContext();
        context.AdminExamRepository.PageOverride = new ExamRepositoryPage([], 45);

        var result = await context.Service.GetAdminPageAsync(
            new GetExamsRequest(Page: 2, PageSize: 20));

        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Value!.Meta.TotalPages);
        Assert.True(result.Value.Meta.HasPreviousPage);
        Assert.True(result.Value.Meta.HasNextPage);
    }

    [Theory]
    [InlineData(0, 20)]
    [InlineData(1, 0)]
    [InlineData(1, 101)]
    [InlineData(int.MaxValue, 100)]
    public async Task Invalid_page_or_page_size_is_rejected(int page, int pageSize)
    {
        var context = CreateContext();

        var result = await context.Service.GetAdminPageAsync(
            new GetExamsRequest(Page: page, PageSize: pageSize));

        Assert.Equal(ExamError.InvalidPagination, result.Error);
    }

    private static CreateExamRequest CreateRequest(IReadOnlyCollection<Guid> tagIds)
    {
        return new CreateExamRequest(
            new CreateExamDetail("Exam title", null, ExamType.Simple),
            tagIds);
    }

    private static IReadOnlyList<PatchOperation> UpdateRequest(
        string? title = null,
        string? description = null,
        ExamType? type = null)
    {
        var operations = new List<PatchOperation>();
        if (title is not null) operations.Add(Replace("/title", title));
        if (description is not null) operations.Add(Replace("/description", description));
        if (type.HasValue) operations.Add(Replace("/type", (int)type.Value));
        return operations;
    }

    private static PatchOperation Replace(string path, object? value) =>
        new("replace", path, JsonSerializer.SerializeToElement(value));

    private static ExamTag CreateTag(bool archived = false)
    {
        var tag = new ExamTag(
            $"Tag {Guid.NewGuid():N}",
            null,
            string.Empty,
            ExamTagType.Topic);

        if (archived)
        {
            tag.Archive();
        }

        return tag;
    }

    private static TestContext CreateContext(
        string slug = "exam-title-12345678",
        IReadOnlyCollection<ExamTag>? tags = null)
    {
        return new TestContext(slug, tags ?? []);
    }

    private sealed class TestContext
    {
        public TestContext(string slug, IReadOnlyCollection<ExamTag> tags)
        {
            TagRepository = new FakeExamTagRepository(tags);
            AdminExamRepository = new FakeExamRepository(tags);
            SlugGenerator = new FakeExamSlugGenerator(slug);
            Service = new AdminExamService(
                AdminExamRepository,
                TagRepository,
                SlugGenerator,
                new FakeUnitOfWork());
        }

        public AdminExamService Service { get; }
        public FakeExamRepository AdminExamRepository { get; }
        public FakeExamTagRepository TagRepository { get; }
        public FakeExamSlugGenerator SlugGenerator { get; }

        public Exam AddExam(
            string title = "Exam title",
            string slug = "exam-title-00000000",
            string? description = null,
            ExamType type = ExamType.Simple,
            IReadOnlyCollection<Guid>? tagIds = null)
        {
            var exam = new Exam(title, slug, description, type);
            exam.AddTags(tagIds ?? []);
            AdminExamRepository.Add(exam);
            return exam;
        }
    }

    private sealed class FakeExamSlugGenerator : IAdminExamSlugGenerator
    {
        private readonly string _slug;

        public FakeExamSlugGenerator(string slug)
        {
            _slug = slug;
        }

        public List<string> Titles { get; } = [];

        public string Generate(string title)
        {
            Titles.Add(title);
            return _slug;
        }
    }

    private sealed class FakeUnitOfWork : IUnitOfWork
    {
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(1);
        }

        public Task<T> ExecuteInTransactionAsync<T>(
            Func<CancellationToken, Task<T>> operation,
            CancellationToken cancellationToken = default)
        {
            return operation(cancellationToken);
        }
    }

    private sealed class FakeExamRepository : IAdminExamRepository
    {
        private readonly List<Exam> _exams = [];
        private readonly IReadOnlyDictionary<Guid, ExamTagData> _tags;

        public FakeExamRepository(IEnumerable<ExamTag> tags)
        {
            _tags = tags.ToDictionary(
                tag => tag.Id,
                tag => new ExamTagData(
                    tag.Id,
                    tag.Name,
                    tag.Slug,
                    tag.Type,
                    tag.IsArchived));
        }

        public ExamRepositoryPage? PageOverride { get; set; }

        public Task<ExamRepositoryPage> GetPageAsync(
            ExamPageQuery query,
            CancellationToken cancellationToken = default)
        {
            if (PageOverride is not null)
            {
                return Task.FromResult(PageOverride);
            }

            var items = _exams.Skip(query.Skip).Take(query.Take).Select(ToData).ToList();
            return Task.FromResult(new ExamRepositoryPage(items, _exams.Count));
        }

        public Task<ExamData?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default)
        {
            var exam = _exams.SingleOrDefault(item => item.Id == id);
            return Task.FromResult(exam is null ? null : ToData(exam));
        }

        public Task<Exam?> GetTrackedWithTagMappingsAsync(
            Guid id,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_exams.SingleOrDefault(item => item.Id == id));
        }

        public Task<bool> ExistsBySlugAsync(
            string slug,
            Guid? excludedExamId = null,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_exams.Any(exam =>
                exam.Slug == slug && exam.Id != excludedExamId));
        }

        public void Add(Exam exam)
        {
            _exams.Add(exam);
        }

        private ExamData ToData(Exam exam)
        {
            return new ExamData(
                exam.Id,
                exam.Title,
                exam.Slug,
                exam.Description,
                exam.Type,
                exam.ExamTagMappings.Select(mapping => _tags[mapping.ExamTagId]).ToList(),
                exam.IsArchived,
                exam.CreatedAtUtc,
                exam.UpdatedAtUtc);
        }
    }

    private sealed class FakeExamTagRepository : IAdminExamTagRepository
    {
        private readonly List<ExamTag> _tags;

        public FakeExamTagRepository(IEnumerable<ExamTag> tags)
        {
            _tags = tags.ToList();
        }

        public Task<IReadOnlyList<ExamTag>> ListAsync(
            ExamTagType? type,
            bool includeArchived,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<ExamTag>>(_tags);
        }

        public Task<ExamTag?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_tags.SingleOrDefault(tag => tag.Id == id));
        }

        public Task<ExamTag?> GetByTypeAndSlugAsync(
            ExamTagType type,
            string slug,
            bool includeArchived,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_tags.SingleOrDefault(tag => tag.Type == type && tag.Slug == slug));
        }

        public Task<bool> ExistsByTypeAndSlugAsync(
            ExamTagType type,
            string slug,
            Guid? excludeId = null,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_tags.Any(tag =>
                tag.Type == type && tag.Slug == slug && tag.Id != excludeId));
        }

        public Task<IReadOnlyCollection<Guid>> GetExistingActiveTagIdsAsync(
            IReadOnlyCollection<Guid> tagIds,
            CancellationToken cancellationToken = default)
        {
            IReadOnlyCollection<Guid> result = _tags
                .Where(tag => tagIds.Contains(tag.Id) && !tag.IsArchived)
                .Select(tag => tag.Id)
                .ToList();
            return Task.FromResult(result);
        }

        public void Add(ExamTag tag)
        {
            _tags.Add(tag);
        }
    }
}