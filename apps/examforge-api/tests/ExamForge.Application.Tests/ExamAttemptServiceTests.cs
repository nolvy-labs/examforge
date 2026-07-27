using System.Text.Json;

using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Student.ExamAttempts.Abstractions;
using ExamForge.Application.Student.ExamAttempts.Dtos;
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
    public async Task Non_owner_receives_not_found()
    {
        var repository = new FakeRepository(null, null);

        var result = await CreateService(repository, Guid.NewGuid())
            .GetDetailAsync(Guid.NewGuid());

        Assert.Equal(ExamAttemptError.AttemptNotFound, result.Error);
    }

    [Fact]
    public async Task Page_forwards_exam_filter_and_uses_filtered_pagination()
    {
        var examId = Guid.NewGuid();
        var studentId = Guid.NewGuid();
        var repository = new FakeRepository(null, null)
        {
            Page = new ExamAttemptPageModel([], 7)
        };

        var result = await CreateService(repository, studentId).GetPageAsync(
            new GetExamAttemptsRequest(
                State: "completed",
                Page: 2,
                PageSize: 5,
                ExamId: examId));

        Assert.True(result.IsSuccess);
        Assert.Equal(studentId, repository.LastPageStudentId);
        Assert.True(repository.LastPageCompleted);
        Assert.Equal(examId, repository.LastPageExamId);
        Assert.Equal(5, repository.LastPageSkip);
        Assert.Equal(5, repository.LastPageTake);
        Assert.Equal(7, result.Value!.Meta.TotalItems);
        Assert.Equal(2, result.Value.Meta.TotalPages);
    }

    [Fact]
    public async Task Page_omits_exam_filter_without_changing_existing_request_behavior()
    {
        var repository = new FakeRepository(null, null);

        var result = await CreateService(repository, Guid.NewGuid()).GetPageAsync(
            new GetExamAttemptsRequest());

        Assert.True(result.IsSuccess);
        Assert.Null(repository.LastPageExamId);
        Assert.False(repository.LastPageCompleted);
        Assert.Equal(0, repository.LastPageSkip);
        Assert.Equal(20, repository.LastPageTake);
    }

    private static ExamAttemptService CreateService(
        FakeRepository repository,
        Guid studentId,
        DateTimeOffset? now = null) =>
        new(
            repository,
            new FakeCurrentUser(studentId),
            new ExamAttemptScoringService(),
            new FakeTimeProvider(now ?? Now));

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
        public Guid? LastPageStudentId { get; private set; }
        public bool LastPageCompleted { get; private set; }
        public Guid? LastPageExamId { get; private set; }
        public int LastPageSkip { get; private set; }
        public int LastPageTake { get; private set; }

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

        public Task<IReadOnlyList<ExamAttempt>> GetExpiredAsync(
            Guid studentId,
            DateTimeOffset nowUtc,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<ExamAttempt>>([]);

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
                true,
                attempt.Revision,
                attempt.Status));
        }

        public Task<ExamAttemptPageModel> GetPageAsync(
            Guid studentId,
            bool completed,
            Guid? examId,
            int skip,
            int take,
            CancellationToken cancellationToken = default)
        {
            LastPageStudentId = studentId;
            LastPageCompleted = completed;
            LastPageExamId = examId;
            LastPageSkip = skip;
            LastPageTake = take;
            return Task.FromResult(Page);
        }
    }
}