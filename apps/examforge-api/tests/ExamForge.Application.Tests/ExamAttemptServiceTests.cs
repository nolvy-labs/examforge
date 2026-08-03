using System.Text.Json;

using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Student.ExamAttempts.Abstractions;
using ExamForge.Application.Student.ExamAttempts.Dtos;
using ExamForge.Application.Student.ExamAttempts.Enums;
using ExamForge.Application.Student.ExamAttempts.Errors;
using ExamForge.Application.Student.ExamAttempts.Models;
using ExamForge.Application.Student.ExamAttempts.Scoring;
using ExamForge.Application.Student.ExamAttempts.Services;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class ExamAttemptServiceTests
{
    private static readonly DateTimeOffset Now =
        DateTimeOffset.Parse("2026-07-26T00:30:00Z");

    [Fact]
    public async Task Create_uses_frozen_version_leaf_questions_and_time_provider()
    {
        var group = ExamAttemptTestFactory.Question(QuestionType.Group, 0m);
        var leaf = ExamAttemptTestFactory.Question(
            QuestionType.FillBlank,
            parentQuestionId: group.Id);
        ExamAttemptTestFactory.AddFillKey(leaf, "answer", false);
        var template = ExamAttemptTestFactory.CreateAttempt(group, leaf);
        var repository = new FakeRepository(template.Exam, template.ExamVersion);
        var service = CreateService(repository, template.StudentId);

        var result = await service.CreateAsync(template.ExamId);

        Assert.True(result.IsSuccess);
        var created = repository.Owned!;
        Assert.Equal(template.ExamVersionId, created.ExamVersionId);
        Assert.Equal(Now, created.StartedAtUtc);
        Assert.Equal(Now.AddMinutes(60), created.ExpiresAtUtc);
        Assert.Equal(leaf.Id, Assert.Single(created.Answers).QuestionId);
        Assert.Empty(created.Answers.Single().SelectedOptions);
        Assert.Equal(1, result.Value!.Revision);
    }

    [Fact]
    public async Task Create_supports_version_without_duration()
    {
        var question = ExamAttemptTestFactory.Question(QuestionType.FillBlank);
        ExamAttemptTestFactory.AddFillKey(question, "answer", false);
        var template = ExamAttemptTestFactory.CreateAttempt(question);
        template.ExamVersion.UpdateDetails(
            template.ExamVersion.Title,
            template.ExamVersion.Description,
            template.ExamVersion.Instructions,
            null);
        var repository = new FakeRepository(template.Exam, template.ExamVersion);

        var result = await CreateService(repository, template.StudentId)
            .CreateAsync(template.ExamId);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value!.ExpiresAtUtc);
    }

    [Fact]
    public async Task Create_returns_existing_active_attempt_id()
    {
        var question = ExamAttemptTestFactory.Question(QuestionType.FillBlank);
        ExamAttemptTestFactory.AddFillKey(question, "answer", false);
        var existing = ExamAttemptTestFactory.CreateAttempt(question);
        var repository = new FakeRepository(existing.Exam, existing.ExamVersion)
        {
            Active = existing,
            Owned = existing
        };

        var result = await CreateService(repository, existing.StudentId)
            .CreateAsync(existing.ExamId);

        Assert.Equal(ExamAttemptError.ActiveAttemptExists, result.Error);
        Assert.Equal(
            existing.Id,
            Assert.IsType<ActiveAttemptConflict>(result.AdditionalData).ExistingAttemptId);
    }

    [Fact]
    public async Task Detail_automatically_submits_expired_attempt_at_deadline()
    {
        var question = ExamAttemptTestFactory.Question(QuestionType.FillBlank, 2m);
        ExamAttemptTestFactory.AddFillKey(question, "answer", false);
        var attempt = ExamAttemptTestFactory.CreateAttempt(question);
        attempt.ApplyAnswers(
            [
                new ExamAttemptAnswerUpdate(
                    question.Id,
                    " Answer ",
                    [],
                    true,
                    false)
            ],
            Now);
        var repository = new FakeRepository(attempt.Exam, attempt.ExamVersion)
        {
            Owned = attempt
        };
        var service = CreateService(
            repository,
            attempt.StudentId,
            DateTimeOffset.Parse("2026-07-26T02:00:00Z"));

        var result = await service.GetDetailAsync(attempt.Id);

        Assert.True(result.IsSuccess);
        Assert.Equal(ExamAttemptStatus.Submitted, result.Value!.Status);
        Assert.Equal(attempt.ExpiresAtUtc, result.Value.SubmittedAtUtc);
        Assert.Equal(2m, result.Value.Score);
        Assert.Equal(3, result.Value.Revision);
        Assert.NotNull(
            result.Value.Sections.Single().Questions.Single().Solution);
    }

    [Fact]
    public async Task Patch_applies_all_changes_and_increments_once()
    {
        var fill = ExamAttemptTestFactory.Question(QuestionType.FillBlank);
        ExamAttemptTestFactory.AddFillKey(fill, "answer", false);
        var choice = ExamAttemptTestFactory.Question(QuestionType.MultipleChoiceSingle);
        var option = ExamAttemptTestFactory.AddOption(choice, true, 0);
        var attempt = ExamAttemptTestFactory.CreateAttempt(fill, choice);
        var repository = new FakeRepository(attempt.Exam, attempt.ExamVersion)
        {
            Owned = attempt
        };
        var operations = new[]
        {
            Replace($"/answers/{fill.Id:D}/textAnswer", " value "),
            Replace($"/answers/{choice.Id:D}/selectedOptionIds", new[] { option.Id })
        };

        var result = await CreateService(repository, attempt.StudentId)
            .PatchAsync(attempt.Id, 1, operations);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.Revision);
        Assert.Equal(
            "value",
            attempt.Answers.Single(answer => answer.QuestionId == fill.Id).TextAnswer);
        Assert.Equal(
            option.Id,
            Assert.Single(attempt.Answers.Single(
                answer => answer.QuestionId == choice.Id).SelectedOptions).QuestionOptionId);
        Assert.Equal(1, repository.SaveCount);
    }

    [Fact]
    public async Task Stale_patch_does_not_mutate_answers()
    {
        var fill = ExamAttemptTestFactory.Question(QuestionType.FillBlank);
        ExamAttemptTestFactory.AddFillKey(fill, "answer", false);
        var attempt = ExamAttemptTestFactory.CreateAttempt(fill);
        var repository = new FakeRepository(attempt.Exam, attempt.ExamVersion)
        {
            Owned = attempt
        };

        var result = await CreateService(repository, attempt.StudentId)
            .PatchAsync(
                attempt.Id,
                99,
                [Replace($"/answers/{fill.Id:D}/textAnswer", "changed")]);

        Assert.Equal(ExamAttemptError.RevisionMismatch, result.Error);
        Assert.Null(attempt.Answers.Single().TextAnswer);
        Assert.Equal(0, repository.SaveCount);
    }

    [Fact]
    public async Task Submit_retry_is_idempotent_even_with_old_revision()
    {
        var fill = ExamAttemptTestFactory.Question(QuestionType.FillBlank, 1m);
        ExamAttemptTestFactory.AddFillKey(fill, "answer", false);
        var attempt = ExamAttemptTestFactory.CreateAttempt(fill);
        attempt.ApplyAnswers(
            [
                new ExamAttemptAnswerUpdate(
                    fill.Id,
                    "answer",
                    [],
                    true,
                    false)
            ],
            Now);
        var repository = new FakeRepository(attempt.Exam, attempt.ExamVersion)
        {
            Owned = attempt
        };
        var service = CreateService(repository, attempt.StudentId);

        var first = await service.SubmitAsync(attempt.Id, 2);
        var retry = await service.SubmitAsync(attempt.Id, 1);

        Assert.True(first.IsSuccess);
        Assert.True(retry.IsSuccess);
        Assert.Equal(3, retry.Value!.Revision);
        Assert.Equal(1, repository.SaveCount);
    }

    [Fact]
    public async Task Abandoning_expired_attempt_submits_then_returns_conflict()
    {
        var fill = ExamAttemptTestFactory.Question(QuestionType.FillBlank);
        ExamAttemptTestFactory.AddFillKey(fill, "answer", false);
        var attempt = ExamAttemptTestFactory.CreateAttempt(fill);
        var repository = new FakeRepository(attempt.Exam, attempt.ExamVersion)
        {
            Owned = attempt
        };

        var result = await CreateService(
                repository,
                attempt.StudentId,
                DateTimeOffset.Parse("2026-07-26T02:00:00Z"))
            .AbandonAsync(attempt.Id, 1);

        Assert.Equal(ExamAttemptError.AttemptAlreadySubmitted, result.Error);
        Assert.Equal(ExamAttemptStatus.Submitted, attempt.Status);
        Assert.Equal(attempt.ExpiresAtUtc, attempt.SubmittedAtUtc);
    }

    [Fact]
    public async Task Background_batch_is_bounded_and_finalizes_expired_attempts()
    {
        var fill = ExamAttemptTestFactory.Question(QuestionType.FillBlank, 2m);
        ExamAttemptTestFactory.AddFillKey(fill, "answer", false);
        var attempt = ExamAttemptTestFactory.CreateAttempt(fill);
        var repository = new FakeRepository(attempt.Exam, attempt.ExamVersion)
        {
            Owned = attempt,
            ExpiredBatch = [attempt]
        };
        var scoring = new ExamAttemptScoringService();
        var processor = new ExamAttemptExpirationBatchProcessor(
            repository,
            new ExamAttemptExpirationFinalizer(repository, scoring),
            new FakeTimeProvider(DateTimeOffset.Parse("2026-07-26T02:00:00Z")));

        var result = await processor.ProcessBatchAsync();

        Assert.Equal(ExamAttemptExpirationBatchProcessor.BatchSize, repository.LastBatchTake);
        Assert.Equal(1, result.FinalizedCount);
        Assert.Empty(result.Failures);
        Assert.Equal(ExamAttemptStatus.Submitted, attempt.Status);
        Assert.Equal(attempt.ExpiresAtUtc, attempt.SubmittedAtUtc);
    }

    [Fact]
    public async Task Expiration_finalizer_is_idempotent_after_concurrent_save_conflict()
    {
        var fill = ExamAttemptTestFactory.Question(QuestionType.FillBlank, 1m);
        ExamAttemptTestFactory.AddFillKey(fill, "answer", false);
        var attempt = ExamAttemptTestFactory.CreateAttempt(fill);
        var repository = new FakeRepository(attempt.Exam, attempt.ExamVersion)
        {
            Owned = attempt,
            SaveSucceeds = false
        };
        var scoring = new ExamAttemptScoringService();
        var finalizer = new ExamAttemptExpirationFinalizer(repository, scoring);

        var result = await finalizer.FinalizeIfExpiredAsync(
            attempt,
            DateTimeOffset.Parse("2026-07-26T02:00:00Z"));

        Assert.True(result.IsSuccess);
        Assert.Equal(ExamAttemptStatus.Submitted, result.Value!.Status);
        Assert.Equal(1, repository.SaveCount);
    }

    [Fact]
    public async Task Non_owner_receives_not_found()
    {
        var repository = new FakeRepository(null, null);

        var result = await CreateService(repository, Guid.NewGuid())
            .GetDetailAsync(Guid.NewGuid());

        Assert.Equal(ExamAttemptError.AttemptNotFound, result.Error);
    }

    [Fact]
    public async Task Page_forwards_composable_filters_sort_and_pagination()
    {
        var examId = Guid.NewGuid();
        var studentId = Guid.NewGuid();
        var repository = new FakeRepository(null, null)
        {
            Page = new ExamAttemptPageModel([], 7)
        };

        var result = await CreateService(repository, studentId).GetPageAsync(
            new GetExamAttemptsRequest(
                Status: "submitted",
                Sort: "created-at-asc",
                Page: 2,
                PageSize: 5,
                ExamId: examId));

        Assert.True(result.IsSuccess);
        Assert.Equal(studentId, repository.LastPageStudentId);
        Assert.Equal(ExamAttemptStatus.Submitted, repository.LastPageStatus);
        Assert.Equal(examId, repository.LastPageExamId);
        Assert.Equal(ExamAttemptSortOrder.CreatedAtAscending, repository.LastPageSort);
        Assert.Equal(5, repository.LastPageSkip);
        Assert.Equal(5, repository.LastPageTake);
        Assert.Equal(7, result.Value!.Meta.TotalItems);
        Assert.Equal(2, result.Value.Meta.TotalPages);
    }

    [Fact]
    public async Task Page_defaults_to_all_statuses_and_created_at_descending()
    {
        var repository = new FakeRepository(null, null);

        var result = await CreateService(repository, Guid.NewGuid()).GetPageAsync(
            new GetExamAttemptsRequest());

        Assert.True(result.IsSuccess);
        Assert.Null(repository.LastPageExamId);
        Assert.Null(repository.LastPageStatus);
        Assert.Equal(ExamAttemptSortOrder.CreatedAtDescending, repository.LastPageSort);
        Assert.Equal(0, repository.LastPageSkip);
        Assert.Equal(20, repository.LastPageTake);
        Assert.Empty(result.Value!.Items);
        Assert.Equal(0, result.Value.Meta.TotalItems);
        Assert.Equal(0, result.Value.Meta.TotalPages);
    }

    [Theory]
    [InlineData("in-progress", ExamAttemptStatus.InProgress)]
    [InlineData("submitted", ExamAttemptStatus.Submitted)]
    [InlineData("abandoned", ExamAttemptStatus.Abandoned)]
    public async Task Page_parses_each_status_without_grouping(
        string token,
        ExamAttemptStatus expected)
    {
        var repository = new FakeRepository(null, null);

        var result = await CreateService(repository, Guid.NewGuid()).GetPageAsync(
            new GetExamAttemptsRequest(Status: token));

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, repository.LastPageStatus);
    }

    [Theory]
    [InlineData("")]
    [InlineData("completed")]
    [InlineData("unknown")]
    public async Task Page_rejects_invalid_status(string status)
    {
        var repository = new FakeRepository(null, null);

        var result = await CreateService(repository, Guid.NewGuid()).GetPageAsync(
            new GetExamAttemptsRequest(Status: status));

        Assert.Equal(ExamAttemptError.InvalidAttemptStatus, result.Error);
        Assert.Equal(0, repository.PageCalls);
    }

    [Theory]
    [InlineData("")]
    [InlineData("updated-at-desc")]
    [InlineData("unknown")]
    public async Task Page_rejects_invalid_sort(string sort)
    {
        var repository = new FakeRepository(null, null);

        var result = await CreateService(repository, Guid.NewGuid()).GetPageAsync(
            new GetExamAttemptsRequest(Sort: sort));

        Assert.Equal(ExamAttemptError.InvalidAttemptSort, result.Error);
        Assert.Equal(0, repository.PageCalls);
    }

    [Theory]
    [InlineData(0, 20, ExamAttemptError.InvalidPage)]
    [InlineData(-1, 20, ExamAttemptError.InvalidPage)]
    [InlineData(1, 0, ExamAttemptError.InvalidPageSize)]
    [InlineData(1, -1, ExamAttemptError.InvalidPageSize)]
    [InlineData(1, 101, ExamAttemptError.InvalidPageSize)]
    [InlineData(int.MaxValue, 2, ExamAttemptError.InvalidPage)]
    public async Task Page_rejects_invalid_pagination(
        int page,
        int pageSize,
        ExamAttemptError expected)
    {
        var repository = new FakeRepository(null, null);

        var result = await CreateService(repository, Guid.NewGuid()).GetPageAsync(
            new GetExamAttemptsRequest(Page: page, PageSize: pageSize));

        Assert.Equal(expected, result.Error);
        Assert.Equal(0, repository.PageCalls);
    }

    [Fact]
    public async Task Page_finalizes_owned_expired_attempts_before_status_query()
    {
        var question = ExamAttemptTestFactory.Question(QuestionType.FillBlank, 2m);
        ExamAttemptTestFactory.AddFillKey(question, "answer", false);
        var attempt = ExamAttemptTestFactory.CreateAttempt(question);
        var repository = new FakeRepository(attempt.Exam, attempt.ExamVersion)
        {
            Owned = attempt,
            Expired = [attempt]
        };
        repository.PageFactory = (_, status, _, _, _, _) =>
        {
            var items = attempt.Status == status
                ? new[] { ToListModel(attempt) }
                : [];
            return new ExamAttemptPageModel(items, items.Length);
        };

        var result = await CreateService(
                repository,
                attempt.StudentId,
                DateTimeOffset.Parse("2026-07-26T02:00:00Z"))
            .GetPageAsync(new GetExamAttemptsRequest(Status: "submitted"));

        Assert.True(result.IsSuccess);
        Assert.Equal(attempt.StudentId, repository.LastExpiredStudentId);
        Assert.Equal(1, repository.SaveCount);
        var item = Assert.Single(result.Value!.Items);
        Assert.Equal(ExamAttemptStatus.Submitted, item.Status);
        Assert.Equal(attempt.CreatedAtUtc, item.CreatedAtUtc);
        Assert.Equal(attempt.UpdatedAtUtc, item.UpdatedAtUtc);
    }

    [Fact]
    public async Task Page_expired_attempt_is_absent_from_in_progress_in_same_request()
    {
        var question = ExamAttemptTestFactory.Question(QuestionType.FillBlank);
        ExamAttemptTestFactory.AddFillKey(question, "answer", false);
        var attempt = ExamAttemptTestFactory.CreateAttempt(question);
        var repository = new FakeRepository(attempt.Exam, attempt.ExamVersion)
        {
            Owned = attempt,
            Expired = [attempt]
        };
        repository.PageFactory = (_, status, _, _, _, _) =>
            new ExamAttemptPageModel(
                attempt.Status == status ? [ToListModel(attempt)] : [],
                attempt.Status == status ? 1 : 0);

        var result = await CreateService(
                repository,
                attempt.StudentId,
                DateTimeOffset.Parse("2026-07-26T02:00:00Z"))
            .GetPageAsync(new GetExamAttemptsRequest(Status: "in-progress"));

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!.Items);
        Assert.Equal(0, result.Value.Meta.TotalItems);
    }

    [Fact]
    public async Task Page_beyond_last_page_preserves_requested_metadata()
    {
        var repository = new FakeRepository(null, null)
        {
            Page = new ExamAttemptPageModel([], 3)
        };

        var result = await CreateService(repository, Guid.NewGuid()).GetPageAsync(
            new GetExamAttemptsRequest(Page: 4, PageSize: 2));

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!.Items);
        Assert.Equal(4, result.Value.Meta.Page);
        Assert.Equal(2, result.Value.Meta.PageSize);
        Assert.Equal(3, result.Value.Meta.TotalItems);
        Assert.Equal(2, result.Value.Meta.TotalPages);
        Assert.True(result.Value.Meta.HasPreviousPage);
        Assert.False(result.Value.Meta.HasNextPage);
    }

    private static ExamAttemptListModel ToListModel(ExamAttempt attempt) =>
        new(
            attempt.Id,
            attempt.ExamId,
            attempt.ExamVersionId,
            attempt.Exam.Title,
            attempt.Exam.Slug,
            attempt.Status,
            attempt.StartedAtUtc,
            attempt.ExpiresAtUtc,
            attempt.SubmittedAtUtc,
            attempt.AbandonedAtUtc,
            attempt.Score,
            attempt.MaximumScore,
            attempt.Revision,
            attempt.CreatedAtUtc,
            attempt.UpdatedAtUtc);

    private static ExamAttemptService CreateService(
        FakeRepository repository,
        Guid studentId,
        DateTimeOffset? now = null) =>
        CreateServiceCore(repository, studentId, new FakeTimeProvider(now ?? Now));

    private static ExamAttemptService CreateServiceCore(
        FakeRepository repository,
        Guid studentId,
        TimeProvider timeProvider)
    {
        var scoring = new ExamAttemptScoringService();
        return new(
            repository,
            new FakeCurrentUser(studentId),
            scoring,
            new ExamAttemptExpirationFinalizer(repository, scoring),
            timeProvider);
    }

    private static PatchOperation Replace(string path, object? value) =>
        new("replace", path, JsonSerializer.SerializeToElement(value));

    private sealed class FakeCurrentUser(Guid studentId) : ICurrentUserContext
    {
        public Guid? UserId => studentId;
    }

    private sealed class FakeTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private sealed class FakeRepository : IExamAttemptRepository
    {
        public FakeRepository(Exam? exam, ExamVersion? version)
        {
            Exam = exam;
            Version = version;
        }

        public Exam? Exam { get; }
        public ExamVersion? Version { get; }
        public ExamAttempt? Active { get; set; }
        public ExamAttempt? Owned { get; set; }
        public ExamAttemptPageModel Page { get; set; } = new([], 0);
        public int SaveCount { get; private set; }
        public bool SaveSucceeds { get; set; } = true;
        public Guid? LastPageStudentId { get; private set; }
        public ExamAttemptStatus? LastPageStatus { get; private set; }
        public Guid? LastPageExamId { get; private set; }
        public ExamAttemptSortOrder LastPageSort { get; private set; }
        public int LastPageSkip { get; private set; }
        public int LastPageTake { get; private set; }
        public int PageCalls { get; private set; }
        public IReadOnlyList<ExamAttempt> Expired { get; set; } = [];
        public Guid? LastExpiredStudentId { get; private set; }
        public Func<Guid, ExamAttemptStatus?, Guid?, ExamAttemptSortOrder, int, int, ExamAttemptPageModel>?
            PageFactory
        { get; set; }
        public IReadOnlyList<ExamAttempt> ExpiredBatch { get; set; } = [];
        public int LastBatchTake { get; private set; }

        public Task<bool> ExamExistsAsync(
            Guid examId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Exam?.Id == examId);

        public Task<ExamVersion?> GetPublishedVersionAsync(
            Guid examId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Version?.ExamId == examId ? Version : null);

        public Task<ExamAttempt?> GetActiveAsync(
            Guid studentId,
            Guid examId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(
                Active is
                {
                    Status: ExamAttemptStatus.InProgress
                } &&
                Active.StudentId == studentId &&
                Active.ExamId == examId
                    ? Active
                    : null);

        public Task<ExamAttempt?> GetOwnedAsync(
            Guid attemptId,
            Guid studentId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(
                Owned?.Id == attemptId && Owned.StudentId == studentId
                    ? Owned
                    : null);

        public Task<ExamAttempt?> GetAsync(
            Guid attemptId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Owned?.Id == attemptId ? Owned : null);

        public Task<IReadOnlyList<ExamAttempt>> GetExpiredAsync(
            Guid studentId,
            DateTimeOffset nowUtc,
            CancellationToken cancellationToken = default)
        {
            LastExpiredStudentId = studentId;
            return Task.FromResult<IReadOnlyList<ExamAttempt>>(
                Expired.Where(attempt => attempt.StudentId == studentId).ToList());
        }

        public Task<IReadOnlyList<ExamAttempt>> GetExpiredBatchAsync(
            DateTimeOffset nowUtc,
            int take,
            CancellationToken cancellationToken = default)
        {
            LastBatchTake = take;
            return Task.FromResult(ExpiredBatch);
        }

        public Task<AttemptCreatePersistenceResult> AddAsync(
            ExamAttempt attempt,
            CancellationToken cancellationToken = default)
        {
            ExamAttemptTestFactory.WireAttempt(attempt, Exam!, Version!);
            Owned = attempt;
            Active = attempt;
            return Task.FromResult(new AttemptCreatePersistenceResult(true, null));
        }

        public Task<AttemptSavePersistenceResult> SaveAsync(
            ExamAttempt attempt,
            CancellationToken cancellationToken = default)
        {
            SaveCount++;
            Owned = attempt;
            Active = attempt.Status == ExamAttemptStatus.InProgress
                ? attempt
                : null;
            return Task.FromResult(new AttemptSavePersistenceResult(
                SaveSucceeds,
                attempt.Revision,
                attempt.Status));
        }

        public Task<ExamAttemptPageModel> GetPageAsync(
            Guid studentId,
            ExamAttemptStatus? status,
            Guid? examId,
            ExamAttemptSortOrder sort,
            int skip,
            int take,
            CancellationToken cancellationToken = default)
        {
            PageCalls++;
            LastPageStudentId = studentId;
            LastPageStatus = status;
            LastPageExamId = examId;
            LastPageSort = sort;
            LastPageSkip = skip;
            LastPageTake = take;
            return Task.FromResult(
                PageFactory?.Invoke(studentId, status, examId, sort, skip, take) ?? Page);
        }
    }
}