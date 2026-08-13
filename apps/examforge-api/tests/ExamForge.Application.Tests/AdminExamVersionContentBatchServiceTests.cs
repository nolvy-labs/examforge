using System.Text.Json;

using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Application.Admin.Exams.Services;
using ExamForge.Application.Common;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class AdminExamVersionContentBatchServiceTests
{
    [Fact]
    public async Task Updates_all_resource_types_atomically_with_bounded_queries()
    {
        var context = new TestContext();
        var multipleChoice = context.AddQuestion(QuestionType.MultipleChoiceSingle, points: 1m);
        var firstOption = context.AddOption(multipleChoice, isCorrect: true);
        var secondOption = context.AddOption(multipleChoice, isCorrect: false);
        var fillBlank = context.AddQuestion(QuestionType.FillBlank, points: 1m);
        var answer = context.AddAnswer(fillBlank, "Answer", false);
        context.Version.InitializeTotalScore(2m);

        var result = await context.Service.UpdateAsync(
            context.Exam.Id,
            context.Version.Id,
            1,
            new BulkUpdateExamVersionContentRequest(
                VersionPatch: [Replace("/instructions", "New instructions")],
                SectionPatches: [new(context.Section.Id, [Replace("/title", "New section")])],
                QuestionPatches: [
                    new(fillBlank.Id, [Replace("/prompt", "New fill prompt"), Replace("/points", 2m)]),
                    new(multipleChoice.Id, [Replace("/prompt", "New choice prompt")])],
                OptionPatches: [new(secondOption.Id, [Replace("/text", "New option"), Replace("/isCorrect", true)])],
                AnswerKeyPatches: [new(answer.Id, [Replace("/acceptedAnswer", " Updated answer ")])]),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, context.Version.ContentRevision);
        Assert.Equal(3m, context.Version.TotalScore);
        Assert.Equal("New instructions", context.Version.Instructions);
        Assert.Equal("New section", context.Section.Title);
        Assert.Equal("New fill prompt", fillBlank.Prompt);
        Assert.Equal("New option", secondOption.Text);
        Assert.True(secondOption.IsCorrect);
        Assert.False(firstOption.IsCorrect);
        Assert.Equal("Updated answer", answer.AcceptedAnswer);
        Assert.Equal(1, context.UnitOfWork.TransactionCount);
        Assert.Equal(1, context.UnitOfWork.SaveCount);
        Assert.Equal(1, context.ContentRepository.SectionQueryCount);
        Assert.Equal(1, context.ContentRepository.QuestionQueryCount);
        Assert.Equal(1, context.ContentRepository.OptionQueryCount);
        Assert.Equal(1, context.ContentRepository.AnswerQueryCount);
        Assert.Equal(1, context.ContentRepository.ScoreQueryCount);
        Assert.Equal(new[] { fillBlank.Id, multipleChoice.Id }, result.Value!.UpdatedQuestions.Select(item => item.Id));
        Assert.Equal(new[] { secondOption.Id, firstOption.Id }, result.Value.UpdatedOptions.Select(item => item.Id));
    }

    [Fact]
    public async Task Empty_and_null_collections_are_no_op()
    {
        var context = new TestContext();

        var result = await context.Service.UpdateAsync(
            context.Exam.Id,
            context.Version.Id,
            1,
            new BulkUpdateExamVersionContentRequest(),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(1, result.Value!.ContentRevision);
        Assert.Empty(result.Value.UpdatedSections);
        Assert.Empty(result.Value.UpdatedQuestions);
        Assert.Empty(result.Value.UpdatedOptions);
        Assert.Empty(result.Value.UpdatedAnswerKeys);
        Assert.Equal(0, context.UnitOfWork.SaveCount);
    }

    [Fact]
    public async Task Duplicate_targets_are_rejected_before_resource_queries()
    {
        var context = new TestContext();
        var question = context.AddQuestion(QuestionType.FillBlank);
        var request = new BulkUpdateExamVersionContentRequest(
            QuestionPatches:
            [
                new(question.Id, []),
                new(question.Id, [Replace("/prompt", "Changed")])
            ]);

        var result = await context.Service.UpdateAsync(
            context.Exam.Id, context.Version.Id, 1, request, CancellationToken.None);

        Assert.Equal(BulkUpdateExamVersionContentError.InvalidRequest, result.Error);
        Assert.Equal("Question", question.Prompt);
        Assert.Equal(0, context.ContentRepository.QuestionQueryCount);
        Assert.Equal(0, context.UnitOfWork.SaveCount);
        var errors = Assert.IsAssignableFrom<IReadOnlyList<BulkContentValidationError>>(result.AdditionalData);
        Assert.Contains(errors, error => error.Code == "duplicate_target");
    }

    [Fact]
    public async Task Stale_revision_is_rejected_before_content_loading()
    {
        var context = new TestContext();

        var result = await context.Service.UpdateAsync(
            context.Exam.Id,
            context.Version.Id,
            99,
            new BulkUpdateExamVersionContentRequest(VersionPatch: [Replace("/title", "Changed")]),
            CancellationToken.None);

        Assert.Equal(BulkUpdateExamVersionContentError.PreconditionFailed, result.Error);
        Assert.Equal("Version", context.Version.Title);
        Assert.Equal(0, context.ContentRepository.TotalQueryCount);
        Assert.Equal(0, context.UnitOfWork.SaveCount);
    }

    [Fact]
    public async Task Invalid_patch_prevents_every_target_mutation()
    {
        var context = new TestContext();
        var question = context.AddQuestion(QuestionType.FillBlank);
        var request = new BulkUpdateExamVersionContentRequest(
            VersionPatch: [Replace("/title", "Changed")],
            QuestionPatches: [new(question.Id, [new PatchOperation("add", "/prompt", Json("Invalid"))])]);

        var result = await context.Service.UpdateAsync(
            context.Exam.Id, context.Version.Id, 1, request, CancellationToken.None);

        Assert.Equal(BulkUpdateExamVersionContentError.InvalidPatch, result.Error);
        Assert.Equal("Version", context.Version.Title);
        Assert.Equal("Question", question.Prompt);
        Assert.Equal(1, context.Version.ContentRevision);
        Assert.Equal(0, context.UnitOfWork.SaveCount);
    }

    [Fact]
    public async Task Explicit_multiple_correct_options_are_rejected()
    {
        var context = new TestContext();
        var question = context.AddQuestion(QuestionType.MultipleChoiceSingle);
        var first = context.AddOption(question, false);
        var second = context.AddOption(question, false);
        var request = new BulkUpdateExamVersionContentRequest(
            OptionPatches:
            [
                new(first.Id, [Replace("/isCorrect", true)]),
                new(second.Id, [Replace("/isCorrect", true)])
            ]);

        var result = await context.Service.UpdateAsync(
            context.Exam.Id, context.Version.Id, 1, request, CancellationToken.None);

        Assert.Equal(BulkUpdateExamVersionContentError.IncompatibleContent, result.Error);
        Assert.False(first.IsCorrect);
        Assert.False(second.IsCorrect);
        Assert.Equal(0, context.UnitOfWork.SaveCount);
        var errors = Assert.IsAssignableFrom<IReadOnlyList<BulkContentValidationError>>(result.AdditionalData);
        Assert.Contains(errors, error => error.Code == "multiple_correct_options");
    }

    [Fact]
    public async Task Duplicate_normalized_answers_are_rejected()
    {
        var context = new TestContext();
        var question = context.AddQuestion(QuestionType.FillBlank);
        context.AddAnswer(question, "Hello World", false);
        var second = context.AddAnswer(question, "Other", true);

        var result = await context.Service.UpdateAsync(
            context.Exam.Id,
            context.Version.Id,
            1,
            new BulkUpdateExamVersionContentRequest(
                AnswerKeyPatches: [new(second.Id, [Replace("/acceptedAnswer", " hello   world ")])]),
            CancellationToken.None);

        Assert.Equal(BulkUpdateExamVersionContentError.IncompatibleContent, result.Error);
        Assert.Equal("Other", second.AcceptedAnswer);
        Assert.Equal(0, context.UnitOfWork.SaveCount);
    }

    [Fact]
    public async Task Foreign_target_is_hidden_as_not_found()
    {
        var context = new TestContext();

        var result = await context.Service.UpdateAsync(
            context.Exam.Id,
            context.Version.Id,
            1,
            new BulkUpdateExamVersionContentRequest(
                SectionPatches: [new(Guid.NewGuid(), [Replace("/title", "Foreign")])]),
            CancellationToken.None);

        Assert.Equal(BulkUpdateExamVersionContentError.TargetNotFound, result.Error);
        Assert.Equal(0, context.UnitOfWork.SaveCount);
    }

    [Fact]
    public async Task Maximum_target_limit_is_enforced()
    {
        var context = new TestContext();
        var targets = Enumerable.Range(0, BulkUpdateExamVersionContentLimits.MaximumTargets + 1)
            .Select(_ => (SectionPatchTarget?)new SectionPatchTarget(Guid.NewGuid(), []))
            .ToList();

        var result = await context.Service.UpdateAsync(
            context.Exam.Id,
            context.Version.Id,
            1,
            new BulkUpdateExamVersionContentRequest(SectionPatches: targets),
            CancellationToken.None);

        Assert.Equal(BulkUpdateExamVersionContentError.InvalidRequest, result.Error);
        Assert.Equal(0, context.ContentRepository.TotalQueryCount);
    }

    [Fact]
    public async Task One_hundred_targets_increment_revision_once_and_use_one_question_query()
    {
        var context = new TestContext();
        var questions = Enumerable.Range(0, 100)
            .Select(_ => context.AddQuestion(QuestionType.FillBlank))
            .ToList();
        var targets = questions.Select((question, index) =>
                (QuestionPatchTarget?)new QuestionPatchTarget(
                    question.Id,
                    [Replace("/prompt", $"Changed {index}")]))
            .ToList();

        var result = await context.Service.UpdateAsync(
            context.Exam.Id,
            context.Version.Id,
            1,
            new BulkUpdateExamVersionContentRequest(QuestionPatches: targets),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(100, result.Value!.UpdatedQuestions.Count);
        Assert.Equal(2, context.Version.ContentRevision);
        Assert.Equal(1, context.UnitOfWork.SaveCount);
        Assert.Equal(1, context.ContentRepository.QuestionQueryCount);
        Assert.Equal(0, context.ContentRepository.ScoreQueryCount);
    }

    [Fact]
    public async Task Text_only_question_change_does_not_query_total_score()
    {
        var context = new TestContext();
        var question = context.AddQuestion(QuestionType.FillBlank);

        var result = await context.Service.UpdateAsync(
            context.Exam.Id,
            context.Version.Id,
            1,
            new BulkUpdateExamVersionContentRequest(
                QuestionPatches: [new(question.Id, [Replace("/prompt", "Changed")])]),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(0, context.ContentRepository.ScoreQueryCount);
    }

    [Fact]
    public async Task Cancellation_token_propagates_through_transaction_and_save()
    {
        var context = new TestContext();
        using var cancellation = new CancellationTokenSource();

        var result = await context.Service.UpdateAsync(
            context.Exam.Id,
            context.Version.Id,
            1,
            new BulkUpdateExamVersionContentRequest(VersionPatch: [Replace("/title", "Changed")]),
            cancellation.Token);

        Assert.True(result.IsSuccess);
        Assert.Equal(cancellation.Token, context.UnitOfWork.LastToken);
    }

    [Fact]
    public async Task Missing_operations_are_rejected()
    {
        var context = new TestContext();

        var result = await context.Service.UpdateAsync(
            context.Exam.Id,
            context.Version.Id,
            1,
            new BulkUpdateExamVersionContentRequest(
                SectionPatches: [new SectionPatchTarget(context.Section.Id, null)]),
            CancellationToken.None);

        Assert.Equal(BulkUpdateExamVersionContentError.InvalidRequest, result.Error);
        var errors = Assert.IsAssignableFrom<IReadOnlyList<BulkContentValidationError>>(result.AdditionalData);
        Assert.Contains(errors, error => error.Code == "operations_required");
    }

    [Fact]
    public async Task Archived_and_non_draft_versions_are_rejected()
    {
        var archived = new TestContext();
        archived.Exam.Archive();
        var archivedResult = await archived.Service.UpdateAsync(
            archived.Exam.Id, archived.Version.Id, 1,
            new BulkUpdateExamVersionContentRequest(), CancellationToken.None);

        var published = new TestContext();
        published.Version.Publish(DateTimeOffset.UtcNow);
        var publishedResult = await published.Service.UpdateAsync(
            published.Exam.Id, published.Version.Id, 1,
            new BulkUpdateExamVersionContentRequest(), CancellationToken.None);

        Assert.Equal(BulkUpdateExamVersionContentError.ExamArchived, archivedResult.Error);
        Assert.Equal(BulkUpdateExamVersionContentError.VersionNotEditable, publishedResult.Error);
    }

    [Fact]
    public async Task Total_operation_limit_is_enforced_before_content_queries()
    {
        var context = new TestContext();
        var operations = Enumerable.Range(0, BulkUpdateExamVersionContentLimits.MaximumOperationsPerTarget)
            .Select(_ => Replace("/prompt", "Changed"))
            .ToList();
        var targets = Enumerable.Range(0, 251)
            .Select(_ => (QuestionPatchTarget?)new QuestionPatchTarget(Guid.NewGuid(), operations))
            .ToList();

        var result = await context.Service.UpdateAsync(
            context.Exam.Id, context.Version.Id, 1,
            new BulkUpdateExamVersionContentRequest(QuestionPatches: targets), CancellationToken.None);

        Assert.Equal(BulkUpdateExamVersionContentError.InvalidRequest, result.Error);
        Assert.Equal(0, context.ContentRepository.TotalQueryCount);
        var errors = Assert.IsAssignableFrom<IReadOnlyList<BulkContentValidationError>>(result.AdditionalData);
        Assert.Contains(errors, error => error.Code == "too_many_total_operations");
    }

    [Fact]
    public async Task Score_recalculation_includes_children_and_excludes_groups()
    {
        var context = new TestContext();
        var group = context.AddQuestion(QuestionType.Group, points: 0m);
        var child = context.AddQuestion(QuestionType.FillBlank, points: 2m, parent: group);
        context.Version.InitializeTotalScore(2m);

        var result = await context.Service.UpdateAsync(
            context.Exam.Id, context.Version.Id, 1,
            new BulkUpdateExamVersionContentRequest(
                QuestionPatches: [new(child.Id, [Replace("/points", 3m)])]),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(3m, context.Version.TotalScore);
        Assert.Equal(1, context.ContentRepository.ScoreQueryCount);
    }

    [Fact]
    public async Task Missing_exam_and_version_are_distinguished()
    {
        var context = new TestContext();

        var missingExam = await context.Service.UpdateAsync(
            Guid.NewGuid(), context.Version.Id, 1,
            new BulkUpdateExamVersionContentRequest(), CancellationToken.None);
        var missingVersion = await context.Service.UpdateAsync(
            context.Exam.Id, Guid.NewGuid(), 1,
            new BulkUpdateExamVersionContentRequest(), CancellationToken.None);

        Assert.Equal(BulkUpdateExamVersionContentError.ExamNotFound, missingExam.Error);
        Assert.Equal(BulkUpdateExamVersionContentError.VersionNotFound, missingVersion.Error);
    }

    [Fact]
    public async Task Persistence_conflict_fails_the_atomic_batch()
    {
        var context = new TestContext();
        var question = context.AddQuestion(QuestionType.FillBlank);
        context.UnitOfWork.ThrowConflictOnSave = true;

        var result = await context.Service.UpdateAsync(
            context.Exam.Id, context.Version.Id, 1,
            new BulkUpdateExamVersionContentRequest(
                QuestionPatches: [new(question.Id, [Replace("/prompt", "Changed")])]),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(BulkUpdateExamVersionContentError.ConcurrencyConflict, result.Error);
        Assert.Equal(1, context.UnitOfWork.TransactionCount);
        Assert.Equal(1, context.UnitOfWork.SaveCount);
    }

    private static PatchOperation Replace(string path, object? value) => new("replace", path, Json(value));
    private static JsonElement Json(object? value) => JsonSerializer.SerializeToElement(value);

    private sealed class TestContext
    {
        public TestContext()
        {
            Exam = new Exam("Exam", "exam-12345678", null, ExamType.Simple);
            Version = new ExamVersion(Exam.Id, 1, "Version", null, null, null, Guid.NewGuid());
            Section = new ExamSection(Version.Id, ExamSectionKind.Default, "Section", null, null, null, 0);
            ((List<ExamSection>)Version.Sections).Add(Section);
            VersionRepository = new FakeVersionRepository(this);
            ContentRepository = new FakeContentRepository(this);
            UnitOfWork = new FakeUnitOfWork();
            Service = new AdminExamVersionContentBatchService(VersionRepository, ContentRepository, UnitOfWork);
        }

        public Exam Exam { get; }
        public ExamVersion Version { get; }
        public ExamSection Section { get; }
        public List<Question> Questions { get; } = [];
        public List<QuestionOption> Options { get; } = [];
        public List<FillAnswerKey> Answers { get; } = [];
        public FakeVersionRepository VersionRepository { get; }
        public FakeContentRepository ContentRepository { get; }
        public FakeUnitOfWork UnitOfWork { get; }
        public AdminExamVersionContentBatchService Service { get; }

        public Question AddQuestion(QuestionType type, decimal points = 1m, Question? parent = null)
        {
            var question = new Question(
                Section.Id, parent?.Id, type, "Question", null,
                type == QuestionType.Group ? 0m : points,
                Questions.Count(item => item.ParentQuestionId == parent?.Id), null);
            Questions.Add(question);
            ((List<Question>)Section.Questions).Add(question);
            if (parent is not null)
                ((List<Question>)parent.ChildQuestions).Add(question);
            return question;
        }

        public QuestionOption AddOption(Question question, bool isCorrect)
        {
            var option = new QuestionOption(question.Id, "Option", null, isCorrect, null, question.Options.Count);
            Options.Add(option);
            ((List<QuestionOption>)question.Options).Add(option);
            return option;
        }

        public FillAnswerKey AddAnswer(Question question, string answer, bool caseSensitive)
        {
            var key = new FillAnswerKey(question.Id, answer, caseSensitive, question.FillAnswerKeys.Count);
            Answers.Add(key);
            ((List<FillAnswerKey>)question.FillAnswerKeys).Add(key);
            return key;
        }
    }

    private sealed class FakeVersionRepository : IAdminExamVersionRepository
    {
        private readonly TestContext _context;
        public FakeVersionRepository(TestContext context) => _context = context;
        public Task<ExamVersionRepositoryPage> GetPageAsync(Guid examId, ExamVersionPageQuery query, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ExamVersionData?> GetDetailAsync(Guid examId, Guid versionId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ExamVersion?> GetTrackedAsync(Guid examId, Guid versionId, CancellationToken cancellationToken = default) =>
            Task.FromResult(examId == _context.Exam.Id && versionId == _context.Version.Id ? _context.Version : null);
        public Task<ExamVersion?> GetTrackedCurrentPublishedAsync(Guid examId, Guid excludedVersionId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ExamVersionData?> GetSourceForCloneAsync(Guid examId, Guid sourceVersionId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<Exam?> GetExamForUpdateAsync(Guid examId, CancellationToken cancellationToken = default) =>
            Task.FromResult(examId == _context.Exam.Id ? _context.Exam : null);
        public Task<bool> ExamExistsAsync(Guid examId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public void Add(ExamVersion version) => throw new NotSupportedException();
        public void Remove(ExamVersion version) => throw new NotSupportedException();
    }

    private sealed class FakeContentRepository : IAdminExamVersionContentBatchRepository
    {
        private readonly TestContext _context;
        public FakeContentRepository(TestContext context) => _context = context;
        public int SectionQueryCount { get; private set; }
        public int QuestionQueryCount { get; private set; }
        public int OptionQueryCount { get; private set; }
        public int AnswerQueryCount { get; private set; }
        public int ScoreQueryCount { get; private set; }
        public int TotalQueryCount => SectionQueryCount + QuestionQueryCount + OptionQueryCount + AnswerQueryCount + ScoreQueryCount;

        public Task<IReadOnlyList<ExamSection>> GetTrackedSectionsAsync(Guid versionId, IReadOnlyCollection<Guid> sectionIds, CancellationToken cancellationToken = default)
        {
            SectionQueryCount++;
            return Task.FromResult<IReadOnlyList<ExamSection>>(versionId == _context.Version.Id && sectionIds.Contains(_context.Section.Id) ? [_context.Section] : []);
        }

        public Task<IReadOnlyList<QuestionOption>> GetTrackedOptionsAsync(Guid versionId, IReadOnlyCollection<Guid> optionIds, CancellationToken cancellationToken = default)
        {
            OptionQueryCount++;
            return Task.FromResult<IReadOnlyList<QuestionOption>>(_context.Options.Where(option => optionIds.Contains(option.Id)).ToList());
        }

        public Task<IReadOnlyList<FillAnswerKey>> GetTrackedAnswerKeysAsync(Guid versionId, IReadOnlyCollection<Guid> answerKeyIds, CancellationToken cancellationToken = default)
        {
            AnswerQueryCount++;
            return Task.FromResult<IReadOnlyList<FillAnswerKey>>(_context.Answers.Where(answer => answerKeyIds.Contains(answer.Id)).ToList());
        }

        public Task<IReadOnlyList<Question>> GetTrackedQuestionsWithContentAsync(Guid versionId, IReadOnlyCollection<Guid> questionIds, CancellationToken cancellationToken = default)
        {
            QuestionQueryCount++;
            return Task.FromResult<IReadOnlyList<Question>>(_context.Questions.Where(question => questionIds.Contains(question.Id)).ToList());
        }

        public Task<IReadOnlyList<Question>> GetTrackedQuestionsForScoreAsync(Guid versionId, CancellationToken cancellationToken = default)
        {
            ScoreQueryCount++;
            return Task.FromResult<IReadOnlyList<Question>>(_context.Questions);
        }
    }

    private sealed class FakeUnitOfWork : IUnitOfWork
    {
        public int SaveCount { get; private set; }
        public int TransactionCount { get; private set; }
        public CancellationToken LastToken { get; private set; }
        public bool ThrowConflictOnSave { get; set; }

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveCount++;
            LastToken = cancellationToken;
            if (ThrowConflictOnSave)
                throw new PersistenceConflictException("Conflict", new InvalidOperationException());
            return Task.FromResult(1);
        }

        public async Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> operation, CancellationToken cancellationToken = default)
        {
            TransactionCount++;
            LastToken = cancellationToken;
            return await operation(cancellationToken);
        }
    }
}
