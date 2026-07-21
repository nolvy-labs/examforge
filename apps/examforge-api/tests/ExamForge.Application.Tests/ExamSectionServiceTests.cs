using System.Text.Json;

using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Application.Admin.Exams.Services;
using ExamForge.Application.Admin.Exams.Utils;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class ExamSectionServiceTests
{
    private static PatchOperation Replace(string path, object? value) =>
        new("replace", path, JsonSerializer.SerializeToElement(value));

    private static PatchOperation Remove(string path) => new("remove", path);

    [Fact]
    public async Task Empty_list_succeeds_and_order_is_deterministic()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();

        var empty = await context.Service.GetListAsync(exam.Id, version.Id);
        context.AddSection(version, "Last", 2);
        var first = context.AddSection(version, "First B", 0);
        var firstById = context.AddSection(version, "First A", 0);
        var ordered = await context.Service.GetListAsync(exam.Id, version.Id);

        Assert.Empty(empty.Value!);
        Assert.Equal(
            new[] { first.Id, firstById.Id }.OrderBy(id => id).Concat(
                context.Sections.Sections.Where(section => section.DisplayOrder == 2).Select(section => section.Id)),
            ordered.Value!.Select(section => section.Id));
    }

    [Fact]
    public async Task Read_maps_non_group_question_aggregates()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();
        var section = context.AddSection(version);
        context.Sections.Aggregates[section.Id] = (3, 7.5m);

        var result = await context.Service.GetByIdAsync(exam.Id, version.Id, section.Id);

        Assert.Equal(3, result.Value!.QuestionCount);
        Assert.Equal(7.5m, result.Value.TotalPoints);
    }

    [Fact]
    public async Task Reads_distinguish_missing_exam_version_and_section()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();
        var otherVersion = context.AddVersion(exam);
        var otherSection = context.AddSection(otherVersion);

        Assert.Equal(ExamSectionError.ExamNotFound,
            (await context.Service.GetListAsync(Guid.NewGuid(), version.Id)).Error);
        Assert.Equal(ExamSectionError.VersionNotFound,
            (await context.Service.GetListAsync(exam.Id, Guid.NewGuid())).Error);
        Assert.Equal(ExamSectionError.SectionNotFound,
            (await context.Service.GetByIdAsync(exam.Id, version.Id, Guid.NewGuid())).Error);
        Assert.Equal(ExamSectionError.SectionNotFound,
            (await context.Service.GetByIdAsync(exam.Id, version.Id, otherSection.Id)).Error);
    }

    [Fact]
    public async Task Create_normalizes_and_appends_from_zero()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();

        var first = await context.Service.CreateAsync(
            exam.Id,
            version.Id,
            Create("  First   section ", instructions: "  Instructions "));
        var second = await context.Service.CreateAsync(exam.Id, version.Id, Create("Second"));

        Assert.Equal(0, first.Value!.DisplayOrder);
        Assert.Equal(1, second.Value!.DisplayOrder);
        Assert.Equal("First section", first.Value.Title);
        Assert.Equal("Instructions", first.Value.Instructions);
        Assert.Equal(3, version.ContentRevision);
        Assert.Equal(2, context.UnitOfWork.SaveCount);
    }

    [Theory]
    [InlineData("", ExamSectionKind.Default, null, null, null, ExamSectionError.InvalidTitle)]
    [InlineData("Title", (ExamSectionKind)999, null, null, null, ExamSectionError.InvalidKind)]
    [InlineData("Title", ExamSectionKind.Default, null, " ", null, ExamSectionError.InvalidStimulusText)]
    [InlineData("Title", ExamSectionKind.Default, null, null, "relative/path", ExamSectionError.InvalidMediaUrl)]
    [InlineData("Title", ExamSectionKind.Default, null, null, "ftp://example.com/a", ExamSectionError.InvalidMediaUrl)]
    public async Task Create_rejects_invalid_values(
        string title,
        ExamSectionKind kind,
        string? instructions,
        string? stimulus,
        string? mediaUrl,
        ExamSectionError expected)
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();

        var result = await context.Service.CreateAsync(
            exam.Id,
            version.Id,
            Create(title, kind, instructions, stimulus, mediaUrl));

        Assert.Equal(expected, result.Error);
        Assert.Empty(context.Sections.Sections);
    }

    [Fact]
    public async Task Create_rejects_overlong_values()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();

        Assert.Equal(ExamSectionError.InvalidTitle,
            (await context.Service.CreateAsync(exam.Id, version.Id,
                Create(new string('a', ExamSectionConstraints.TitleMaxLength + 1)))).Error);
        Assert.Equal(ExamSectionError.InvalidInstructions,
            (await context.Service.CreateAsync(exam.Id, version.Id,
                Create("Title", instructions: new string('a', ExamSectionConstraints.InstructionsMaxLength + 1)))).Error);
        Assert.Equal(ExamSectionError.InvalidStimulusText,
            (await context.Service.CreateAsync(exam.Id, version.Id,
                Create("Title", stimulus: new string('a', ExamSectionConstraints.StimulusTextMaxLength + 1)))).Error);
        Assert.Equal(ExamSectionError.InvalidMediaUrl,
            (await context.Service.CreateAsync(exam.Id, version.Id,
                Create("Title", mediaUrl: $"https://example.com/{new string('a', ExamSectionConstraints.MediaUrlMaxLength)}"))).Error);
    }

    [Fact]
    public async Task Null_create_request_and_detail_are_controlled()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();

        Assert.Equal(ExamSectionError.InvalidRequest,
            (await context.Service.CreateAsync(exam.Id, version.Id, null)).Error);
        Assert.Equal(ExamSectionError.InvalidRequest,
            (await context.Service.CreateAsync(
                exam.Id,
                version.Id,
                new CreateExamSectionRequest(null!))).Error);
    }

    [Fact]
    public async Task Mutations_reject_archived_exam()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();
        var section = context.AddSection(version);
        exam.Archive();

        Assert.Equal(ExamSectionError.ExamArchived,
            (await context.Service.CreateAsync(exam.Id, version.Id, Create("New"))).Error);
        Assert.Equal(ExamSectionError.ExamArchived,
            (await context.Service.UpdateAsync(exam.Id, version.Id, section.Id, [])).Error);
        Assert.Equal(ExamSectionError.ExamArchived,
            (await context.Service.ReorderAsync(exam.Id, version.Id, new([section.Id]))).Error);
        Assert.Equal(ExamSectionError.ExamArchived,
            await context.Service.DeleteAsync(exam.Id, version.Id, section.Id));
    }

    [Theory]
    [InlineData(ExamVersionStatus.Published)]
    [InlineData(ExamVersionStatus.Retired)]
    public async Task Mutations_reject_non_draft_versions(ExamVersionStatus status)
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion(status);
        var section = context.AddSection(version);

        Assert.Equal(ExamSectionError.VersionNotEditable,
            (await context.Service.CreateAsync(exam.Id, version.Id, Create("New"))).Error);
        Assert.Equal(ExamSectionError.VersionNotEditable,
            (await context.Service.UpdateAsync(exam.Id, version.Id, section.Id, [])).Error);
        Assert.Equal(ExamSectionError.VersionNotEditable,
            (await context.Service.ReorderAsync(exam.Id, version.Id, new([section.Id]))).Error);
        Assert.Equal(ExamSectionError.VersionNotEditable,
            await context.Service.DeleteAsync(exam.Id, version.Id, section.Id));
    }

    [Fact]
    public async Task Create_maps_display_order_exhaustion_and_concurrency()
    {
        var exhausted = new TestContext();
        var (exam, version) = exhausted.AddExamAndVersion();
        exhausted.AddSection(version, displayOrder: int.MaxValue);

        Assert.Equal(ExamSectionError.DisplayOrderExhausted,
            (await exhausted.Service.CreateAsync(exam.Id, version.Id, Create("New"))).Error);

        var conflict = new TestContext();
        var (conflictExam, conflictVersion) = conflict.AddExamAndVersion();
        conflict.UnitOfWork.ThrowConflict = true;
        Assert.Equal(ExamSectionError.ConcurrencyConflict,
            (await conflict.Service.CreateAsync(conflictExam.Id, conflictVersion.Id, Create("New"))).Error);
    }

    [Fact]
    public async Task Partial_update_changes_each_field_and_preserves_omitted_values()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();
        var section = context.AddSection(
            version,
            instructions: "Old instructions",
            stimulus: "Old stimulus",
            mediaUrl: "https://example.com/old");

        var title = await context.Service.UpdateAsync(
            exam.Id, version.Id, section.Id, [Replace("/title", " New title ")]);
        var kind = await context.Service.UpdateAsync(
            exam.Id, version.Id, section.Id, [Replace("/kind", (int)ExamSectionKind.Listening)]);
        var instructions = await context.Service.UpdateAsync(
            exam.Id, version.Id, section.Id, [Replace("/instructions", "")]);
        var stimulus = await context.Service.UpdateAsync(
            exam.Id, version.Id, section.Id, [Replace("/stimulusText", " New stimulus ")]);
        var media = await context.Service.UpdateAsync(
            exam.Id, version.Id, section.Id, [Replace("/mediaUrl", " https://example.com/new ")]);

        Assert.Equal("New title", title.Value!.Title);
        Assert.Equal("Old instructions", title.Value.Instructions);
        Assert.Equal(ExamSectionKind.Listening, kind.Value!.Kind);
        Assert.Equal(string.Empty, instructions.Value!.Instructions);
        Assert.Equal("New stimulus", stimulus.Value!.StimulusText);
        Assert.Equal("https://example.com/new", media.Value!.MediaUrl);
        Assert.Equal(6, version.ContentRevision);
    }

    [Fact]
    public async Task Explicit_clear_flags_clear_optional_fields()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();
        var section = context.AddSection(
            version,
            stimulus: "Stimulus",
            mediaUrl: "https://example.com/media");

        var stimulus = await context.Service.UpdateAsync(
            exam.Id, version.Id, section.Id, [Remove("/stimulusText")]);
        var media = await context.Service.UpdateAsync(
            exam.Id, version.Id, section.Id, [Remove("/mediaUrl")]);

        Assert.Null(stimulus.Value!.StimulusText);
        Assert.Null(media.Value!.MediaUrl);
    }

    [Fact]
    public async Task Patch_rejects_unsupported_operation_without_changes()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();
        var section = context.AddSection(version);

        var result = await context.Service.UpdateAsync(
            exam.Id, version.Id, section.Id,
            [Replace("/title", "Changed"), new PatchOperation("add", "/mediaUrl", JsonSerializer.SerializeToElement("https://example.com"))]);

        Assert.Equal(ExamSectionError.InvalidPatch, result.Error);
        Assert.Equal("Section", section.Title);
    }

    [Fact]
    public async Task Patch_rejects_whitespace_optional_replacements()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();
        var section = context.AddSection(version);

        Assert.Equal(ExamSectionError.InvalidPatch,
            (await context.Service.UpdateAsync(
                exam.Id, version.Id, section.Id, [Replace("/stimulusText", " ")])).Error);
        Assert.Equal(ExamSectionError.InvalidPatch,
            (await context.Service.UpdateAsync(
                exam.Id, version.Id, section.Id, [Replace("/mediaUrl", " ")])).Error);
    }

    [Fact]
    public async Task Empty_patch_is_no_op_and_wrong_ownership_is_hidden()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();
        var otherVersion = context.AddVersion(exam);
        var section = context.AddSection(otherVersion);
        var saves = context.UnitOfWork.SaveCount;

        Assert.Equal(ExamSectionError.SectionNotFound,
            (await context.Service.UpdateAsync(exam.Id, version.Id, section.Id, [])).Error);
        var own = context.AddSection(version);
        var updatedAt = own.UpdatedAtUtc;
        var result = await context.Service.UpdateAsync(exam.Id, version.Id, own.Id, []);

        Assert.True(result.IsSuccess);
        Assert.Equal(saves, context.UnitOfWork.SaveCount);
        Assert.Equal(updatedAt, own.UpdatedAtUtc);
    }

    [Fact]
    public async Task Reorder_assigns_contiguous_values_using_two_safe_phases()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();
        var first = context.AddSection(version, "First", 0);
        var second = context.AddSection(version, "Second", 1);
        var third = context.AddSection(version, "Third", 2);

        var result = await context.Service.ReorderAsync(
            exam.Id,
            version.Id,
            new([third.Id, first.Id, second.Id]));

        Assert.Equal(new[] { third.Id, first.Id, second.Id }, result.Value!.Select(item => item.Id));
        Assert.Equal(new[] { 0, 1, 2 }, result.Value!.Select(item => item.DisplayOrder));
        Assert.Equal(2, version.ContentRevision);
        Assert.Equal(2, context.UnitOfWork.OrderSnapshots.Count);
        Assert.All(context.UnitOfWork.OrderSnapshots[0], order => Assert.True(order < 0));
        Assert.Equal(new[] { 0, 1, 2 }, context.UnitOfWork.OrderSnapshots[1].Order());
    }

    [Fact]
    public async Task Reorder_same_order_is_no_op()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();
        var first = context.AddSection(version, displayOrder: 0);
        var second = context.AddSection(version, displayOrder: 1);

        var result = await context.Service.ReorderAsync(
            exam.Id, version.Id, new([first.Id, second.Id]));

        Assert.True(result.IsSuccess);
        Assert.Equal(1, version.ContentRevision);
        Assert.Equal(0, context.UnitOfWork.SaveCount);
    }

    [Fact]
    public async Task Reorder_requires_exact_unique_set()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();
        var first = context.AddSection(version, displayOrder: 0);
        var second = context.AddSection(version, displayOrder: 1);
        var otherVersion = context.AddVersion(exam);
        var foreign = context.AddSection(otherVersion);

        Assert.Equal(ExamSectionError.InvalidSectionOrder,
            (await context.Service.ReorderAsync(exam.Id, version.Id, new([first.Id, first.Id]))).Error);
        Assert.Equal(ExamSectionError.InvalidSectionOrder,
            (await context.Service.ReorderAsync(exam.Id, version.Id, new([first.Id]))).Error);
        Assert.Equal(ExamSectionError.InvalidSectionOrder,
            (await context.Service.ReorderAsync(exam.Id, version.Id, new([first.Id, second.Id, Guid.NewGuid()]))).Error);
        Assert.Equal(ExamSectionError.InvalidSectionOrder,
            (await context.Service.ReorderAsync(exam.Id, version.Id, new([first.Id, foreign.Id]))).Error);
    }

    [Fact]
    public async Task Empty_reorder_matches_only_empty_version()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();

        Assert.True((await context.Service.ReorderAsync(exam.Id, version.Id, new([]))).IsSuccess);
        context.AddSection(version);
        Assert.Equal(ExamSectionError.InvalidSectionOrder,
            (await context.Service.ReorderAsync(exam.Id, version.Id, new([]))).Error);
        Assert.Equal(ExamSectionError.InvalidRequest,
            (await context.Service.ReorderAsync(
                exam.Id,
                version.Id,
                new ReorderExamSectionsRequest(null!))).Error);
    }

    [Fact]
    public async Task Reorder_maps_concurrency_conflict()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();
        var first = context.AddSection(version, displayOrder: 0);
        var second = context.AddSection(version, displayOrder: 1);
        context.UnitOfWork.ThrowConflict = true;

        var result = await context.Service.ReorderAsync(
            exam.Id, version.Id, new([second.Id, first.Id]));

        Assert.Equal(ExamSectionError.ConcurrencyConflict, result.Error);
    }

    [Fact]
    public async Task Delete_removes_section_and_compacts_remaining_order_safely()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();
        context.AddSection(version, "First", 0);
        var removed = context.AddSection(version, "Second", 1);
        context.AddSection(version, "Third", 2);

        var error = await context.Service.DeleteAsync(exam.Id, version.Id, removed.Id);

        Assert.Equal(ExamSectionError.None, error);
        Assert.Equal(2, version.ContentRevision);
        Assert.DoesNotContain(context.Sections.Sections, section => section.Id == removed.Id);
        Assert.Equal(new[] { 0, 1 }, context.Sections.Sections.Select(section => section.DisplayOrder).Order());
        Assert.All(context.UnitOfWork.OrderSnapshots[0], order => Assert.True(order < 0));
    }

    [Fact]
    public async Task Delete_hides_missing_and_cross_version_sections()
    {
        var context = new TestContext();
        var (exam, version) = context.AddExamAndVersion();
        var otherVersion = context.AddVersion(exam);
        var foreign = context.AddSection(otherVersion);

        Assert.Equal(ExamSectionError.SectionNotFound,
            await context.Service.DeleteAsync(exam.Id, version.Id, Guid.NewGuid()));
        Assert.Equal(ExamSectionError.SectionNotFound,
            await context.Service.DeleteAsync(exam.Id, version.Id, foreign.Id));
    }

    private static CreateExamSectionRequest Create(
        string title,
        ExamSectionKind kind = ExamSectionKind.Default,
        string? instructions = null,
        string? stimulus = null,
        string? mediaUrl = null) =>
        new(new(title, kind, instructions, stimulus, mediaUrl));

    private sealed class TestContext
    {
        public TestContext()
        {
            Versions = new FakeExamVersionRepository();
            Sections = new FakeExamSectionRepository();
            UnitOfWork = new FakeUnitOfWork(Sections);
            Service = new AdminExamSectionService(Sections, Versions, UnitOfWork);
        }

        public AdminExamSectionService Service { get; }
        public FakeExamVersionRepository Versions { get; }
        public FakeExamSectionRepository Sections { get; }
        public FakeUnitOfWork UnitOfWork { get; }

        public (Exam Exam, ExamVersion Version) AddExamAndVersion(
            ExamVersionStatus status = ExamVersionStatus.Draft)
        {
            var exam = new Exam("Exam", $"exam-{Guid.NewGuid():N}", null, ExamType.Simple);
            Versions.Exams.Add(exam);
            return (exam, AddVersion(exam, status));
        }

        public ExamVersion AddVersion(
            Exam exam,
            ExamVersionStatus status = ExamVersionStatus.Draft)
        {
            var version = new ExamVersion(
                exam.Id,
                exam.AllocateNextVersionNumber(),
                "Version",
                null,
                null,
                null,
                Guid.NewGuid());

            if (status is ExamVersionStatus.Published or ExamVersionStatus.Retired)
            {
                version.Publish(DateTimeOffset.UtcNow.AddMinutes(-1));
            }

            if (status == ExamVersionStatus.Retired)
            {
                version.Retire(DateTimeOffset.UtcNow);
            }

            Versions.Versions.Add(version);
            return version;
        }

        public ExamSection AddSection(
            ExamVersion version,
            string title = "Section",
            int displayOrder = 0,
            string? instructions = null,
            string? stimulus = null,
            string? mediaUrl = null)
        {
            var section = new ExamSection(
                version.Id,
                ExamSectionKind.Default,
                title,
                instructions,
                stimulus,
                mediaUrl,
                displayOrder);
            Sections.Sections.Add(section);
            return section;
        }
    }

    private sealed class FakeExamSectionRepository : IAdminExamSectionRepository
    {
        public List<ExamSection> Sections { get; } = [];
        public Dictionary<Guid, (int Count, decimal Points)> Aggregates { get; } = [];

        public Task<IReadOnlyList<ExamSectionData>> GetListAsync(
            Guid examId,
            Guid versionId,
            CancellationToken cancellationToken = default)
        {
            IReadOnlyList<ExamSectionData> result = Sections
                .Where(section => section.ExamVersionId == versionId)
                .OrderBy(section => section.DisplayOrder)
                .ThenBy(section => section.Id)
                .Select(section => ToData(examId, section))
                .ToList();
            return Task.FromResult(result);
        }

        public Task<ExamSectionData?> GetDetailAsync(
            Guid examId,
            Guid versionId,
            Guid sectionId,
            CancellationToken cancellationToken = default)
        {
            var section = Sections.SingleOrDefault(item =>
                item.ExamVersionId == versionId && item.Id == sectionId);
            return Task.FromResult(section is null ? null : ToData(examId, section));
        }

        public Task<ExamSection?> GetTrackedAsync(
            Guid versionId,
            Guid sectionId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Sections.SingleOrDefault(section =>
                section.ExamVersionId == versionId && section.Id == sectionId));

        public Task<IReadOnlyList<ExamSection>> GetTrackedListAsync(
            Guid versionId,
            CancellationToken cancellationToken = default)
        {
            IReadOnlyList<ExamSection> result = Sections
                .Where(section => section.ExamVersionId == versionId)
                .OrderBy(section => section.DisplayOrder)
                .ThenBy(section => section.Id)
                .ToList();
            return Task.FromResult(result);
        }

        public Task<int?> GetMaximumDisplayOrderAsync(
            Guid versionId,
            CancellationToken cancellationToken = default)
        {
            var values = Sections
                .Where(section => section.ExamVersionId == versionId)
                .Select(section => (int?)section.DisplayOrder);
            return Task.FromResult(values.Any() ? values.Max() : null);
        }

        public void Add(ExamSection section) => Sections.Add(section);
        public void Remove(ExamSection section) => Sections.Remove(section);

        private ExamSectionData ToData(Guid examId, ExamSection section)
        {
            var aggregate = Aggregates.GetValueOrDefault(section.Id);
            return new ExamSectionData(
                section.Id,
                section.ExamVersionId,
                examId,
                section.Kind,
                section.Title,
                section.Instructions,
                section.StimulusText,
                section.MediaUrl,
                section.DisplayOrder,
                aggregate.Count,
                aggregate.Points,
                section.CreatedAtUtc,
                section.UpdatedAtUtc);
        }
    }

    private sealed class FakeExamVersionRepository : IAdminExamVersionRepository
    {
        public List<Exam> Exams { get; } = [];
        public List<ExamVersion> Versions { get; } = [];

        public Task<ExamVersionRepositoryPage> GetPageAsync(
            Guid examId,
            ExamVersionPageQuery query,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<ExamVersionData?> GetDetailAsync(
            Guid examId,
            Guid versionId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(ToData(Find(examId, versionId)));

        public Task<ExamVersionData?> GetCurrentPublishedAsync(
            Guid examId,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<ExamVersion?> GetTrackedAsync(
            Guid examId,
            Guid versionId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Find(examId, versionId));

        public Task<ExamVersion?> GetTrackedCurrentPublishedAsync(
            Guid examId,
            Guid excludedVersionId,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<ExamVersionData?> GetSourceForCloneAsync(
            Guid examId,
            Guid sourceVersionId,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<Exam?> GetExamForUpdateAsync(
            Guid examId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Exams.SingleOrDefault(exam => exam.Id == examId));

        public Task<bool> ExamExistsAsync(
            Guid examId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Exams.Any(exam => exam.Id == examId));

        public void Add(ExamVersion version) => Versions.Add(version);
        public void Remove(ExamVersion version) => Versions.Remove(version);

        private ExamVersion? Find(Guid examId, Guid versionId) =>
            Versions.SingleOrDefault(version => version.ExamId == examId && version.Id == versionId);

        private static ExamVersionData? ToData(ExamVersion? version) =>
            version is null
                ? null
                : new ExamVersionData(
                    version.Id,
                    version.ExamId,
                    version.VersionNumber,
                    version.Status,
                    version.Title,
                    version.Description,
                    version.Instructions,
                    version.DurationMinutes,
                    version.TotalScore,
                    version.ContentRevision,
                    version.CreatedByUserId,
                    version.PublishedAtUtc,
                    version.RetiredAtUtc,
                    version.CreatedAtUtc,
                    version.UpdatedAtUtc);
    }

    private sealed class FakeUnitOfWork : IUnitOfWork
    {
        private readonly FakeExamSectionRepository _repository;

        public FakeUnitOfWork(FakeExamSectionRepository repository)
        {
            _repository = repository;
        }

        public int SaveCount { get; private set; }
        public bool ThrowConflict { get; set; }
        public List<int[]> OrderSnapshots { get; } = [];

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveCount++;
            OrderSnapshots.Add(_repository.Sections.Select(section => section.DisplayOrder).ToArray());
            return Task.FromResult(1);
        }

        public async Task<T> ExecuteInTransactionAsync<T>(
            Func<CancellationToken, Task<T>> operation,
            CancellationToken cancellationToken = default)
        {
            if (ThrowConflict)
            {
                throw new PersistenceConflictException("Conflict", new InvalidOperationException());
            }

            return await operation(cancellationToken);
        }
    }
}