using System.Reflection;

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

public sealed class ExamVersionServiceTests
{
    [Fact]
    public async Task Empty_creation_uses_exam_metadata_starts_at_one_and_records_current_user()
    {
        var context = new TestContext();
        var exam = context.AddExam(description: "Exam description");

        var result = await context.Service.CreateAsync(exam.Id, new CreateExamVersionRequest());

        Assert.True(result.IsSuccess);
        Assert.Equal(1, result.Value!.VersionNumber);
        Assert.Equal(exam.Title, result.Value.Title);
        Assert.Equal("Exam description", result.Value.Description);
        Assert.Equal(string.Empty, result.Value.Instructions);
        Assert.Equal(0m, result.Value.TotalScore);
        Assert.Equal(context.CurrentUser.UserId, result.Value.CreatedByUserId);
        Assert.Equal(ExamVersionStatus.Draft, result.Value.Status);
    }

    [Fact]
    public async Task Consecutive_creation_allocates_increasing_numbers()
    {
        var context = new TestContext();
        var exam = context.AddExam();

        var first = await context.Service.CreateAsync(exam.Id, new CreateExamVersionRequest());
        var second = await context.Service.CreateAsync(exam.Id, new CreateExamVersionRequest());

        Assert.Equal(1, first.Value!.VersionNumber);
        Assert.Equal(2, second.Value!.VersionNumber);
        Assert.Equal(3, exam.NextVersionNumber);
    }

    [Fact]
    public async Task Deleting_latest_draft_does_not_reuse_version_number()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var first = await context.Service.CreateAsync(exam.Id, new CreateExamVersionRequest());

        Assert.Equal(ExamVersionError.None, await context.Service.DeleteAsync(exam.Id, first.Value!.Id));
        var second = await context.Service.CreateAsync(exam.Id, new CreateExamVersionRequest());

        Assert.Equal(2, second.Value!.VersionNumber);
    }

    [Fact]
    public async Task Creation_is_rejected_for_archived_exam()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        exam.Archive();

        var result = await context.Service.CreateAsync(exam.Id, new CreateExamVersionRequest());

        Assert.Equal(ExamVersionError.ExamArchived, result.Error);
        Assert.Empty(context.Repository.Versions);
    }

    [Fact]
    public async Task Creation_rejects_missing_current_user()
    {
        var context = new TestContext(useDefaultUser: false);
        var exam = context.AddExam();

        var result = await context.Service.CreateAsync(exam.Id, new CreateExamVersionRequest());

        Assert.Equal(ExamVersionError.CurrentUserUnavailable, result.Error);
    }

    [Theory]
    [InlineData(ExamVersionStatus.Draft)]
    [InlineData(ExamVersionStatus.Published)]
    [InlineData(ExamVersionStatus.Retired)]
    public async Task Clone_is_allowed_from_every_version_status(ExamVersionStatus status)
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var source = context.AddVersion(
            exam,
            title: "Source title",
            description: "Source description",
            instructions: "Source instructions",
            durationMinutes: 90,
            status: status);

        var result = await context.Service.CreateAsync(
            exam.Id,
            new CreateExamVersionRequest(source.Id));

        Assert.True(result.IsSuccess);
        Assert.Equal(ExamVersionStatus.Draft, result.Value!.Status);
        Assert.Equal("Source title", result.Value.Title);
        Assert.Equal("Source description", result.Value.Description);
        Assert.Equal("Source instructions", result.Value.Instructions);
        Assert.Equal(90, result.Value.DurationMinutes);
        Assert.Equal(0m, result.Value.TotalScore);
        Assert.Equal(context.CurrentUser.UserId, result.Value.CreatedByUserId);
        Assert.Null(result.Value.PublishedAtUtc);
        Assert.Null(result.Value.RetiredAtUtc);
    }

    [Fact]
    public async Task Clone_source_must_belong_to_same_exam()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var otherExam = context.AddExam("Other exam");
        var source = context.AddVersion(otherExam);

        var result = await context.Service.CreateAsync(
            exam.Id,
            new CreateExamVersionRequest(source.Id));

        Assert.Equal(ExamVersionError.SourceVersionNotFound, result.Error);
    }

    [Fact]
    public async Task Clone_succeeds_for_empty_source()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var source = context.AddVersion(exam);

        var result = await context.Service.CreateAsync(
            exam.Id,
            new CreateExamVersionRequest(source.Id));

        Assert.True(result.IsSuccess);
        Assert.Equal(source.Id, context.Cloner.LastSourceVersionId);
    }

    [Fact]
    public async Task Clone_succeeds_for_populated_source()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var source = context.AddVersion(exam);

        var result = await context.Service.CreateAsync(
            exam.Id,
            new CreateExamVersionRequest(source.Id));

        Assert.True(result.IsSuccess);
        Assert.Equal(source.Id, context.Cloner.LastSourceVersionId);
        Assert.Equal(2, context.Repository.Versions.Count);
    }

    [Fact]
    public async Task List_calculates_metadata_and_forwards_status_and_sort()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        context.Repository.PageOverride = new ExamVersionRepositoryPage([], 45);

        var result = await context.Service.GetPageAsync(
            exam.Id,
            new GetExamVersionsRequest(2, 20, ExamVersionStatus.Draft, ExamSortOrder.Oldest));

        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Value!.Meta.TotalPages);
        Assert.True(result.Value.Meta.HasPreviousPage);
        Assert.True(result.Value.Meta.HasNextPage);
        Assert.Equal(ExamVersionStatus.Draft, context.Repository.LastPageQuery!.Status);
        Assert.Equal(ExamSortOrder.Oldest, context.Repository.LastPageQuery.Sort);
    }

    [Theory]
    [InlineData(ExamSortOrder.Newest)]
    [InlineData(ExamSortOrder.Oldest)]
    public async Task List_ordering_is_deterministic(ExamSortOrder sort)
    {
        var context = new TestContext();
        var exam = context.AddExam();
        context.AddVersion(exam, title: "First");
        context.AddVersion(exam, title: "Second");

        var result = await context.Service.GetPageAsync(
            exam.Id,
            new GetExamVersionsRequest(Sort: sort));

        var expected = sort == ExamSortOrder.Newest
            ? context.Repository.Versions.OrderByDescending(x => x.CreatedAtUtc).ThenByDescending(x => x.Id)
            : context.Repository.Versions.OrderBy(x => x.CreatedAtUtc).ThenBy(x => x.Id);
        Assert.Equal(expected.Select(x => x.Id), result.Value!.Items.Select(x => x.Id));
    }

    [Fact]
    public async Task Current_published_returns_published_version()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var published = context.AddVersion(exam, status: ExamVersionStatus.Published);

        var result = await context.Service.GetCurrentPublishedAsync(exam.Id);

        Assert.True(result.IsSuccess);
        Assert.Equal(published.Id, result.Value!.Id);
    }

    [Fact]
    public async Task Missing_published_version_returns_specific_error()
    {
        var context = new TestContext();
        var exam = context.AddExam();

        var result = await context.Service.GetCurrentPublishedAsync(exam.Id);

        Assert.Equal(ExamVersionError.PublishedVersionNotFound, result.Error);
    }

    [Fact]
    public async Task Detail_rejects_version_belonging_to_another_exam()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var other = context.AddExam("Other exam");
        var version = context.AddVersion(other);

        var result = await context.Service.GetByIdAsync(exam.Id, version.Id);

        Assert.Equal(ExamVersionError.VersionNotFound, result.Error);
    }

    [Fact]
    public async Task Draft_metadata_supports_partial_update_and_empty_text_clears_fields()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var version = context.AddVersion(
            exam,
            title: "Original",
            description: "Description",
            instructions: "Instructions",
            durationMinutes: 60);

        var partial = await context.Service.UpdateAsync(
            exam.Id,
            version.Id,
            new UpdateExamVersionRequest(Title: "Changed"));
        var cleared = await context.Service.UpdateAsync(
            exam.Id,
            version.Id,
            new UpdateExamVersionRequest(Description: "", Instructions: ""));

        Assert.Equal("Changed", partial.Value!.Title);
        Assert.Equal("Description", partial.Value.Description);
        Assert.Equal(60, partial.Value.DurationMinutes);
        Assert.Equal(string.Empty, cleared.Value!.Description);
        Assert.Equal(string.Empty, cleared.Value.Instructions);
    }

    [Fact]
    public async Task All_null_patch_is_no_op()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var version = context.AddVersion(exam);
        var updatedAt = version.UpdatedAtUtc;
        var savesBefore = context.UnitOfWork.SaveCount;

        var result = await context.Service.UpdateAsync(
            exam.Id,
            version.Id,
            new UpdateExamVersionRequest());

        Assert.True(result.IsSuccess);
        Assert.Equal(updatedAt, version.UpdatedAtUtc);
        Assert.Equal(savesBefore, context.UnitOfWork.SaveCount);
    }

    [Theory]
    [InlineData(ExamVersionStatus.Published)]
    [InlineData(ExamVersionStatus.Retired)]
    public async Task Non_draft_metadata_cannot_be_edited(ExamVersionStatus status)
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var version = context.AddVersion(exam, status: status);

        var result = await context.Service.UpdateAsync(
            exam.Id,
            version.Id,
            new UpdateExamVersionRequest(Title: "Changed"));

        Assert.Equal(ExamVersionError.VersionNotEditable, result.Error);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(1441)]
    public async Task Duration_validation_rejects_out_of_range_values(int duration)
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var version = context.AddVersion(exam);

        var result = await context.Service.UpdateAsync(
            exam.Id,
            version.Id,
            new UpdateExamVersionRequest(DurationMinutes: duration));

        Assert.Equal(ExamVersionError.InvalidDuration, result.Error);
    }

    [Fact]
    public async Task Draft_publication_requires_readiness()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var version = context.AddVersion(exam);

        var result = await context.Service.PublishAsync(exam.Id, version.Id);

        Assert.Equal(ExamVersionError.VersionNotReadyForPublication, result.Error);
        Assert.Equal(ExamVersionStatus.Draft, version.Status);
    }

    [Fact]
    public async Task Publishing_ready_draft_retires_previous_version_in_one_transaction()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var previous = context.AddVersion(exam, status: ExamVersionStatus.Published);
        var target = context.AddVersion(exam);
        context.Readiness.ReadyVersionIds.Add(target.Id);
        var transactionsBefore = context.UnitOfWork.TransactionCount;

        var result = await context.Service.PublishAsync(exam.Id, target.Id);

        Assert.True(result.IsSuccess);
        Assert.Equal(ExamVersionStatus.Published, target.Status);
        Assert.Equal(ExamVersionStatus.Retired, previous.Status);
        Assert.Equal(transactionsBefore + 1, context.UnitOfWork.TransactionCount);
    }

    [Fact]
    public async Task Repeating_publish_is_no_op()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var version = context.AddVersion(exam, status: ExamVersionStatus.Published);
        var publishedAt = version.PublishedAtUtc;
        var updatedAt = version.UpdatedAtUtc;

        var result = await context.Service.PublishAsync(exam.Id, version.Id);

        Assert.True(result.IsSuccess);
        Assert.Equal(publishedAt, version.PublishedAtUtc);
        Assert.Equal(updatedAt, version.UpdatedAtUtc);
    }

    [Fact]
    public async Task Published_can_be_retired_and_repeated_retire_is_no_op()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var version = context.AddVersion(exam, status: ExamVersionStatus.Published);

        var first = await context.Service.RetireAsync(exam.Id, version.Id);
        var retiredAt = version.RetiredAtUtc;
        var second = await context.Service.RetireAsync(exam.Id, version.Id);

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);
        Assert.Equal(ExamVersionStatus.Retired, version.Status);
        Assert.Equal(retiredAt, version.RetiredAtUtc);
    }

    [Fact]
    public async Task Draft_cannot_be_retired()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var version = context.AddVersion(exam);

        var result = await context.Service.RetireAsync(exam.Id, version.Id);

        Assert.Equal(ExamVersionError.InvalidStatusTransition, result.Error);
    }

    [Fact]
    public async Task Retired_can_be_republished_with_refreshed_timestamps()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var version = context.AddVersion(exam, status: ExamVersionStatus.Retired);
        var priorPublishedAt = version.PublishedAtUtc;
        context.Readiness.ReadyVersionIds.Add(version.Id);

        var result = await context.Service.PublishAsync(exam.Id, version.Id);

        Assert.True(result.IsSuccess);
        Assert.Equal(ExamVersionStatus.Published, version.Status);
        Assert.True(version.PublishedAtUtc >= priorPublishedAt);
        Assert.Null(version.RetiredAtUtc);
    }

    [Theory]
    [InlineData(ExamVersionStatus.Published)]
    [InlineData(ExamVersionStatus.Retired)]
    public async Task Only_draft_can_be_deleted(ExamVersionStatus status)
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var version = context.AddVersion(exam, status: status);

        var error = await context.Service.DeleteAsync(exam.Id, version.Id);

        Assert.Equal(ExamVersionError.VersionCannotBeDeleted, error);
    }

    [Fact]
    public async Task Every_mutation_is_rejected_for_archived_parent_but_reads_remain_available()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        var draft = context.AddVersion(exam);
        exam.Archive();

        Assert.Equal(ExamVersionError.ExamArchived,
            (await context.Service.CreateAsync(exam.Id, new CreateExamVersionRequest())).Error);
        Assert.Equal(ExamVersionError.ExamArchived,
            (await context.Service.UpdateAsync(exam.Id, draft.Id, new UpdateExamVersionRequest(Title: "X"))).Error);
        Assert.Equal(ExamVersionError.ExamArchived,
            (await context.Service.PublishAsync(exam.Id, draft.Id)).Error);
        Assert.Equal(ExamVersionError.ExamArchived,
            (await context.Service.RetireAsync(exam.Id, draft.Id)).Error);
        Assert.Equal(ExamVersionError.ExamArchived,
            await context.Service.DeleteAsync(exam.Id, draft.Id));
        Assert.True((await context.Service.GetByIdAsync(exam.Id, draft.Id)).IsSuccess);
        Assert.True((await context.Service.GetPageAsync(exam.Id, new GetExamVersionsRequest())).IsSuccess);
    }

    [Fact]
    public async Task Version_number_exhaustion_returns_controlled_error()
    {
        var context = new TestContext();
        var exam = context.AddExam();
        SetNextVersionNumber(exam, int.MaxValue);

        var result = await context.Service.CreateAsync(exam.Id, new CreateExamVersionRequest());

        Assert.Equal(ExamVersionError.VersionNumberExhausted, result.Error);
    }

    private static void SetNextVersionNumber(Exam exam, int value)
    {
        typeof(Exam)
            .GetProperty(nameof(Exam.NextVersionNumber), BindingFlags.Instance | BindingFlags.Public)!
            .GetSetMethod(nonPublic: true)!
            .Invoke(exam, [value]);
    }

    private sealed class TestContext
    {
        public TestContext(Guid? userId = null, bool useDefaultUser = true)
        {
            Repository = new FakeExamVersionRepository();
            Cloner = new FakeContentCloner();
            Readiness = new FakeReadinessChecker();
            CurrentUser = new FakeCurrentUserContext(
                useDefaultUser && userId is null ? Guid.NewGuid() : userId);
            UnitOfWork = new FakeUnitOfWork(Repository);
            Service = new AdminExamVersionService(
                Repository,
                Cloner,
                Readiness,
                CurrentUser,
                UnitOfWork);
        }

        public AdminExamVersionService Service { get; }
        public FakeExamVersionRepository Repository { get; }
        public FakeContentCloner Cloner { get; }
        public FakeReadinessChecker Readiness { get; }
        public FakeCurrentUserContext CurrentUser { get; }
        public FakeUnitOfWork UnitOfWork { get; }

        public Exam AddExam(string title = "Exam title", string? description = null)
        {
            var exam = new Exam(title, $"exam-{Guid.NewGuid():N}", description, ExamType.Simple);
            Repository.Exams.Add(exam);
            return exam;
        }

        public ExamVersion AddVersion(
            Exam exam,
            string title = "Version title",
            string? description = "Description",
            string? instructions = "Instructions",
            int? durationMinutes = 30,
            ExamVersionStatus status = ExamVersionStatus.Draft)
        {
            var version = new ExamVersion(
                exam.Id,
                exam.AllocateNextVersionNumber(),
                title,
                description,
                instructions,
                durationMinutes,
                CurrentUser.UserId ?? Guid.NewGuid());

            if (status is ExamVersionStatus.Published or ExamVersionStatus.Retired)
            {
                version.Publish(DateTimeOffset.UtcNow.AddMinutes(-1));
            }

            if (status == ExamVersionStatus.Retired)
            {
                version.Retire(DateTimeOffset.UtcNow);
            }

            Repository.Versions.Add(version);
            return version;
        }
    }

    private sealed class FakeCurrentUserContext : ICurrentUserContext
    {
        public FakeCurrentUserContext(Guid? userId)
        {
            UserId = userId;
        }

        public Guid? UserId { get; }
    }

    private sealed class FakeContentCloner : IAdminExamVersionContentCloner
    {
        public Guid? LastSourceVersionId { get; private set; }

        public Task<ExamVersionContentClonePlan> CloneAsync(
            Guid sourceVersionId,
            Guid targetVersionId,
            CancellationToken cancellationToken = default)
        {
            LastSourceVersionId = sourceVersionId;
            return Task.FromResult(new ExamVersionContentClonePlan([], [], [], [], 0m));
        }
    }

    private sealed class FakeReadinessChecker : IAdminExamVersionPublishReadinessChecker
    {
        public HashSet<Guid> ReadyVersionIds { get; } = [];

        public Task<bool> IsReadyAsync(Guid versionId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(ReadyVersionIds.Contains(versionId));
        }
    }

    private sealed class FakeUnitOfWork : IUnitOfWork
    {
        private readonly FakeExamVersionRepository _repository;

        public FakeUnitOfWork(FakeExamVersionRepository repository)
        {
            _repository = repository;
        }

        public int SaveCount { get; private set; }
        public int TransactionCount { get; private set; }

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveCount++;
            return Task.FromResult(1);
        }

        public async Task<T> ExecuteInTransactionAsync<T>(
            Func<CancellationToken, Task<T>> operation,
            CancellationToken cancellationToken = default)
        {
            TransactionCount++;
            var savesBefore = SaveCount;
            var nextNumbers = _repository.Exams.ToDictionary(exam => exam.Id, exam => exam.NextVersionNumber);
            var result = await operation(cancellationToken);

            if (SaveCount == savesBefore)
            {
                foreach (var exam in _repository.Exams)
                {
                    SetNextVersionNumber(exam, nextNumbers[exam.Id]);
                }
            }

            return result;
        }
    }

    private sealed class FakeExamVersionRepository : IAdminExamVersionRepository
    {
        public List<Exam> Exams { get; } = [];
        public List<ExamVersion> Versions { get; } = [];
        public ExamVersionRepositoryPage? PageOverride { get; set; }
        public ExamVersionPageQuery? LastPageQuery { get; private set; }

        public Task<ExamVersionRepositoryPage> GetPageAsync(
            Guid examId,
            ExamVersionPageQuery query,
            CancellationToken cancellationToken = default)
        {
            LastPageQuery = query;

            if (PageOverride is not null)
            {
                return Task.FromResult(PageOverride);
            }

            var versions = Versions.Where(version => version.ExamId == examId);

            if (query.Status.HasValue)
            {
                versions = versions.Where(version => version.Status == query.Status.Value);
            }

            versions = query.Sort == ExamSortOrder.Oldest
                ? versions.OrderBy(version => version.CreatedAtUtc).ThenBy(version => version.Id)
                : versions.OrderByDescending(version => version.CreatedAtUtc).ThenByDescending(version => version.Id);
            var all = versions.ToList();
            return Task.FromResult(new ExamVersionRepositoryPage(
                all.Skip(query.Skip).Take(query.Take).Select(ToData).ToList(),
                all.Count));
        }

        public Task<ExamVersionData?> GetDetailAsync(
            Guid examId,
            Guid versionId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(ToDataOrNull(Find(examId, versionId)));
        }

        public Task<ExamVersionData?> GetCurrentPublishedAsync(
            Guid examId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(ToDataOrNull(Versions.SingleOrDefault(version =>
                version.ExamId == examId && version.Status == ExamVersionStatus.Published)));
        }

        public Task<ExamVersion?> GetTrackedAsync(
            Guid examId,
            Guid versionId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Find(examId, versionId));
        }

        public Task<ExamVersion?> GetTrackedCurrentPublishedAsync(
            Guid examId,
            Guid excludedVersionId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Versions.SingleOrDefault(version =>
                version.ExamId == examId &&
                version.Id != excludedVersionId &&
                version.Status == ExamVersionStatus.Published));
        }

        public Task<ExamVersionData?> GetSourceForCloneAsync(
            Guid examId,
            Guid sourceVersionId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(ToDataOrNull(Find(examId, sourceVersionId)));
        }

        public Task<Exam?> GetExamForUpdateAsync(
            Guid examId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Exams.SingleOrDefault(exam => exam.Id == examId));
        }

        public Task<bool> ExamExistsAsync(Guid examId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Exams.Any(exam => exam.Id == examId));
        }

        public void Add(ExamVersion version)
        {
            Versions.Add(version);
        }

        public void Remove(ExamVersion version)
        {
            Versions.Remove(version);
        }

        private ExamVersion? Find(Guid examId, Guid versionId)
        {
            return Versions.SingleOrDefault(version =>
                version.ExamId == examId && version.Id == versionId);
        }

        private static ExamVersionData? ToDataOrNull(ExamVersion? version)
        {
            return version is null ? null : ToData(version);
        }

        private static ExamVersionData ToData(ExamVersion version)
        {
            return new ExamVersionData(
                version.Id,
                version.ExamId,
                version.VersionNumber,
                version.Status,
                version.Title,
                version.Description,
                version.Instructions,
                version.DurationMinutes,
                version.TotalScore,
                version.CreatedByUserId,
                version.PublishedAtUtc,
                version.RetiredAtUtc,
                version.CreatedAtUtc,
                version.UpdatedAtUtc);
        }
    }
}