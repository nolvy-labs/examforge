using ExamForge.Application.Abstractions;
using ExamForge.Application.Exams;
using ExamForge.Application.Exams.Dtos;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class QuestionContentServiceTests
{
    [Fact]
    public async Task Question_create_applies_default_points_and_updates_total()
    {
        var context = new TestContext();

        var result = await context.Questions.CreateAsync(
            context.Exam.Id,
            context.Version.Id,
            context.Section.Id,
            new CreateQuestionRequest(new CreateQuestionDetail(
                QuestionType.FillBlank,
                "  Fill   this ")));

        Assert.True(result.IsSuccess);
        Assert.Equal(1m, result.Value!.Points);
        Assert.Equal(1m, context.Version.TotalScore);
        Assert.Equal(0, result.Value.DisplayOrder);
    }

    [Fact]
    public async Task Question_child_requires_top_level_group_in_same_section()
    {
        var context = new TestContext();
        var ordinary = context.AddQuestion(QuestionType.FillBlank);

        var result = await context.Questions.CreateAsync(
            context.Exam.Id,
            context.Version.Id,
            context.Section.Id,
            new CreateQuestionRequest(
                new CreateQuestionDetail(QuestionType.FillBlank, "Child"),
                ordinary.Id));

        Assert.Equal(QuestionError.InvalidParentQuestion, result.Error);
    }

    [Fact]
    public async Task Question_create_appends_within_sibling_scope()
    {
        var context = new TestContext();
        var group = context.AddQuestion(QuestionType.Group);
        context.AddQuestion(QuestionType.FillBlank, group.Id);

        var result = await context.Questions.CreateAsync(
            context.Exam.Id,
            context.Version.Id,
            context.Section.Id,
            new CreateQuestionRequest(
                new CreateQuestionDetail(QuestionType.MultipleChoiceSingle, "Child two"),
                group.Id));

        Assert.True(result.IsSuccess);
        Assert.Equal(group.Id, result.Value!.ParentQuestionId);
        Assert.Equal(1, result.Value.DisplayOrder);
    }

    [Fact]
    public async Task Question_write_rejects_non_draft_version()
    {
        var context = new TestContext();
        context.Version.Publish(DateTimeOffset.UtcNow);

        var result = await context.Questions.CreateAsync(
            context.Exam.Id,
            context.Version.Id,
            context.Section.Id,
            new CreateQuestionRequest(new CreateQuestionDetail(
                QuestionType.FillBlank,
                "Question")));

        Assert.Equal(QuestionError.VersionNotEditable, result.Error);
    }

    [Fact]
    public async Task Question_reorder_requires_exact_sibling_set()
    {
        var context = new TestContext();
        var first = context.AddQuestion(QuestionType.FillBlank);
        context.AddQuestion(QuestionType.FillBlank);

        var result = await context.Questions.ReorderAsync(
            context.Exam.Id,
            context.Version.Id,
            context.Section.Id,
            new ReorderQuestionsRequest(null, [first.Id]));

        Assert.Equal(QuestionError.InvalidQuestionOrder, result.Error);
    }

    [Fact]
    public async Task Single_correct_option_replaces_previous_correct_option()
    {
        var context = new TestContext();
        var question = context.AddQuestion(QuestionType.MultipleChoiceSingle);
        var first = context.AddOption(question, isCorrect: true);

        var result = await context.Options.CreateAsync(
            context.Exam.Id,
            context.Version.Id,
            context.Section.Id,
            question.Id,
            new CreateQuestionOptionRequest(new CreateQuestionOptionDetail(
                "Second",
                IsCorrect: true)));

        Assert.True(result.IsSuccess);
        Assert.False(first.IsCorrect);
        Assert.True(result.Value!.IsCorrect);
        Assert.Single(context.OptionRepository.Options, option => option.IsCorrect);
    }

    [Fact]
    public async Task Option_create_rejects_non_multiple_choice_question()
    {
        var context = new TestContext();
        var question = context.AddQuestion(QuestionType.FillBlank);

        var result = await context.Options.CreateAsync(
            context.Exam.Id,
            context.Version.Id,
            context.Section.Id,
            question.Id,
            new CreateQuestionOptionRequest(new CreateQuestionOptionDetail("Option")));

        Assert.Equal(QuestionOptionError.QuestionDoesNotSupportOptions, result.Error);
    }

    [Fact]
    public async Task Fill_answer_duplicate_check_covers_sensitive_and_insensitive_values()
    {
        var context = new TestContext();
        var question = context.AddQuestion(QuestionType.FillBlank);
        context.AddAnswerKey(question, "Answer", isCaseSensitive: false);

        var result = await context.AnswerKeys.CreateAsync(
            context.Exam.Id,
            context.Version.Id,
            context.Section.Id,
            question.Id,
            new CreateFillAnswerKeyRequest(" answer ", IsCaseSensitive: true));

        Assert.Equal(FillAnswerKeyError.DuplicateAcceptedAnswer, result.Error);
    }

    [Fact]
    public async Task Fill_answer_update_recomputes_normalized_value()
    {
        var context = new TestContext();
        var question = context.AddQuestion(QuestionType.FillBlank);
        var key = context.AddAnswerKey(question, "First", isCaseSensitive: false);

        var result = await context.AnswerKeys.UpdateAsync(
            context.Exam.Id,
            context.Version.Id,
            context.Section.Id,
            question.Id,
            key.Id,
            new UpdateFillAnswerKeyRequest(" Second  Value ", IsCaseSensitive: true));

        Assert.True(result.IsSuccess);
        Assert.Equal("Second Value", result.Value!.AcceptedAnswer);
        Assert.Equal("Second Value", key.NormalizedAnswer);
    }

    [Fact]
    public async Task Persistence_conflict_maps_to_feature_error()
    {
        var context = new TestContext();
        context.UnitOfWork.ThrowConflict = true;

        var result = await context.Questions.CreateAsync(
            context.Exam.Id,
            context.Version.Id,
            context.Section.Id,
            new CreateQuestionRequest(new CreateQuestionDetail(
                QuestionType.FillBlank,
                "Question")));

        Assert.Equal(QuestionError.ConcurrencyConflict, result.Error);
    }

    private sealed class TestContext
    {
        public TestContext()
        {
            Exam = new Exam("Exam", "exam-12345678", null, ExamType.Simple);
            Version = new ExamVersion(Exam.Id, 1, "Version", null, null, null, Guid.NewGuid());
            Section = new ExamSection(
                Version.Id,
                ExamSectionKind.Default,
                "Section",
                null,
                null,
                null,
                0);
            QuestionRepository = new FakeQuestionRepository(this);
            OptionRepository = new FakeQuestionOptionRepository();
            AnswerKeyRepository = new FakeFillAnswerKeyRepository();
            VersionRepository = new FakeExamVersionRepository(this);
            SectionRepository = new FakeExamSectionRepository(this);
            UnitOfWork = new FakeUnitOfWork();
            Questions = new QuestionService(
                QuestionRepository,
                SectionRepository,
                VersionRepository,
                UnitOfWork);
            Options = new QuestionOptionService(
                OptionRepository,
                QuestionRepository,
                SectionRepository,
                VersionRepository,
                UnitOfWork);
            AnswerKeys = new FillAnswerKeyService(
                AnswerKeyRepository,
                QuestionRepository,
                SectionRepository,
                VersionRepository,
                UnitOfWork);
        }

        public Exam Exam { get; }
        public ExamVersion Version { get; }
        public ExamSection Section { get; }
        public FakeQuestionRepository QuestionRepository { get; }
        public FakeQuestionOptionRepository OptionRepository { get; }
        public FakeFillAnswerKeyRepository AnswerKeyRepository { get; }
        public FakeExamVersionRepository VersionRepository { get; }
        public FakeExamSectionRepository SectionRepository { get; }
        public FakeUnitOfWork UnitOfWork { get; }
        public QuestionService Questions { get; }
        public QuestionOptionService Options { get; }
        public FillAnswerKeyService AnswerKeys { get; }

        public Question AddQuestion(
            QuestionType type,
            Guid? parentId = null,
            decimal? points = null)
        {
            var question = new Question(
                Section.Id,
                parentId,
                type,
                "Question",
                null,
                points ?? (type == QuestionType.Group ? 0m : 1m),
                QuestionRepository.Questions.Count(item => item.ParentQuestionId == parentId));
            QuestionRepository.Add(question);
            return question;
        }

        public QuestionOption AddOption(Question question, bool isCorrect)
        {
            var option = new QuestionOption(
                question.Id,
                "Option",
                null,
                isCorrect,
                null,
                OptionRepository.Options.Count(item => item.QuestionId == question.Id));
            OptionRepository.Add(option);
            return option;
        }

        public FillAnswerKey AddAnswerKey(
            Question question,
            string answer,
            bool isCaseSensitive)
        {
            var key = new FillAnswerKey(
                question.Id,
                answer,
                isCaseSensitive,
                AnswerKeyRepository.Keys.Count(item => item.QuestionId == question.Id));
            AnswerKeyRepository.Add(key);
            return key;
        }
    }

    private sealed class FakeQuestionRepository : IQuestionRepository
    {
        private readonly TestContext _context;

        public FakeQuestionRepository(TestContext context) => _context = context;
        public List<Question> Questions { get; } = [];

        public Task<IReadOnlyList<QuestionData>> GetListAsync(
            Guid examId, Guid versionId, Guid sectionId,
            CancellationToken cancellationToken = default)
        {
            IReadOnlyList<QuestionData> result = Questions
                .Where(question => question.ExamSectionId == sectionId)
                .OrderBy(question => question.ParentQuestionId.HasValue
                    ? Questions.Single(parent => parent.Id == question.ParentQuestionId).DisplayOrder
                    : question.DisplayOrder)
                .ThenBy(question => question.ParentQuestionId.HasValue ? 1 : 0)
                .ThenBy(question => question.DisplayOrder)
                .Select(ToData)
                .ToList();
            return Task.FromResult(result);
        }

        public Task<QuestionDetailData?> GetDetailAsync(
            Guid examId, Guid versionId, Guid sectionId, Guid questionId,
            CancellationToken cancellationToken = default)
        {
            var question = Questions.SingleOrDefault(item =>
                item.ExamSectionId == sectionId && item.Id == questionId);

            if (question is null)
            {
                return Task.FromResult<QuestionDetailData?>(null);
            }

            var options = _context.OptionRepository.Options
                .Where(option => option.QuestionId == questionId)
                .OrderBy(option => option.DisplayOrder)
                .Select(ToData)
                .ToList();
            var keys = _context.AnswerKeyRepository.Keys
                .Where(key => key.QuestionId == questionId)
                .OrderBy(key => key.DisplayOrder)
                .Select(ToData)
                .ToList();
            return Task.FromResult<QuestionDetailData?>(new(
                ToData(question),
                options,
                keys));
        }

        public Task<Question?> GetTrackedAsync(
            Guid sectionId, Guid questionId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Questions.SingleOrDefault(question =>
                question.ExamSectionId == sectionId && question.Id == questionId));

        public Task<IReadOnlyList<Question>> GetTrackedSiblingsAsync(
            Guid sectionId, Guid? parentQuestionId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Question>>(Questions
                .Where(question => question.ExamSectionId == sectionId &&
                    question.ParentQuestionId == parentQuestionId)
                .OrderBy(question => question.DisplayOrder)
                .ToList());

        public Task<IReadOnlyList<Question>> GetTrackedChildrenAsync(
            Guid sectionId, Guid parentQuestionId,
            CancellationToken cancellationToken = default) =>
            GetTrackedSiblingsAsync(sectionId, parentQuestionId, cancellationToken);

        public Task<int?> GetMaximumDisplayOrderAsync(
            Guid sectionId, Guid? parentQuestionId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Questions
                .Where(question => question.ExamSectionId == sectionId &&
                    question.ParentQuestionId == parentQuestionId)
                .Select(question => (int?)question.DisplayOrder)
                .Max());

        public Task<decimal> GetVersionTotalScoreAsync(
            Guid versionId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Questions
                .Where(question => question.Type != QuestionType.Group)
                .Sum(question => question.Points));

        public void Add(Question question) => Questions.Add(question);
        public void Remove(Question question) => Questions.Remove(question);
        public void RemoveRange(IEnumerable<Question> questions)
        {
            foreach (var question in questions.ToList())
            {
                Questions.Remove(question);
            }
        }

        private QuestionData ToData(Question question)
        {
            var options = _context.OptionRepository.Options.Where(item => item.QuestionId == question.Id).ToList();
            var keys = _context.AnswerKeyRepository.Keys.Where(item => item.QuestionId == question.Id).ToList();
            var childCount = Questions.Count(item => item.ParentQuestionId == question.Id);
            var complete = question.Type switch
            {
                QuestionType.Group => childCount > 0,
                QuestionType.FillBlank => keys.Count > 0,
                QuestionType.MultipleChoiceSingle => options.Count >= 2 && options.Count(item => item.IsCorrect) == 1,
                _ => options.Count >= 2 && options.Any(item => item.IsCorrect)
            };
            return new QuestionData(
                question.Id, question.ExamSectionId, question.ParentQuestionId,
                question.Type, question.Prompt, question.Explanation, question.Points,
                question.DisplayOrder, childCount, options.Count, keys.Count, complete,
                question.CreatedAtUtc, question.UpdatedAtUtc);
        }

        private static QuestionOptionData ToData(QuestionOption option) => new(
            option.Id, option.QuestionId, option.Label, option.Text, option.IsCorrect,
            option.DisplayOrder, option.Explanation, option.CreatedAtUtc, option.UpdatedAtUtc);

        private static FillAnswerKeyData ToData(FillAnswerKey key) => new(
            key.Id, key.QuestionId, key.BlankKey, key.AcceptedAnswer,
            key.IsCaseSensitive, key.DisplayOrder, key.CreatedAtUtc, key.UpdatedAtUtc);
    }

    private sealed class FakeQuestionOptionRepository : IQuestionOptionRepository
    {
        public List<QuestionOption> Options { get; } = [];

        public Task<IReadOnlyList<QuestionOptionData>> GetListAsync(
            Guid examId, Guid versionId, Guid sectionId, Guid questionId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<QuestionOptionData>>(Options
                .Where(option => option.QuestionId == questionId)
                .OrderBy(option => option.DisplayOrder)
                .Select(ToData)
                .ToList());

        public async Task<QuestionOptionData?> GetDetailAsync(
            Guid examId, Guid versionId, Guid sectionId, Guid questionId, Guid optionId,
            CancellationToken cancellationToken = default) =>
            (await GetListAsync(examId, versionId, sectionId, questionId, cancellationToken))
                .SingleOrDefault(option => option.Id == optionId);

        public Task<IReadOnlyList<QuestionOption>> GetTrackedListAsync(
            Guid questionId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<QuestionOption>>(Options
                .Where(option => option.QuestionId == questionId)
                .OrderBy(option => option.DisplayOrder)
                .ToList());

        public Task<int?> GetMaximumDisplayOrderAsync(
            Guid questionId, CancellationToken cancellationToken = default) =>
            Task.FromResult(Options.Where(option => option.QuestionId == questionId)
                .Select(option => (int?)option.DisplayOrder).Max());

        public void Add(QuestionOption option) => Options.Add(option);
        public void Remove(QuestionOption option) => Options.Remove(option);

        private static QuestionOptionData ToData(QuestionOption option) => new(
            option.Id, option.QuestionId, option.Label, option.Text, option.IsCorrect,
            option.DisplayOrder, option.Explanation, option.CreatedAtUtc, option.UpdatedAtUtc);
    }

    private sealed class FakeFillAnswerKeyRepository : IFillAnswerKeyRepository
    {
        public List<FillAnswerKey> Keys { get; } = [];

        public Task<IReadOnlyList<FillAnswerKeyData>> GetListAsync(
            Guid examId, Guid versionId, Guid sectionId, Guid questionId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<FillAnswerKeyData>>(Keys
                .Where(key => key.QuestionId == questionId)
                .OrderBy(key => key.DisplayOrder)
                .Select(ToData)
                .ToList());

        public async Task<FillAnswerKeyData?> GetDetailAsync(
            Guid examId, Guid versionId, Guid sectionId, Guid questionId, Guid answerKeyId,
            CancellationToken cancellationToken = default) =>
            (await GetListAsync(examId, versionId, sectionId, questionId, cancellationToken))
                .SingleOrDefault(key => key.Id == answerKeyId);

        public Task<IReadOnlyList<FillAnswerKey>> GetTrackedListAsync(
            Guid questionId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<FillAnswerKey>>(Keys
                .Where(key => key.QuestionId == questionId)
                .OrderBy(key => key.DisplayOrder)
                .ToList());

        public Task<int?> GetMaximumDisplayOrderAsync(
            Guid questionId, CancellationToken cancellationToken = default) =>
            Task.FromResult(Keys.Where(key => key.QuestionId == questionId)
                .Select(key => (int?)key.DisplayOrder).Max());

        public void Add(FillAnswerKey answerKey) => Keys.Add(answerKey);
        public void Remove(FillAnswerKey answerKey) => Keys.Remove(answerKey);

        private static FillAnswerKeyData ToData(FillAnswerKey key) => new(
            key.Id, key.QuestionId, key.BlankKey, key.AcceptedAnswer,
            key.IsCaseSensitive, key.DisplayOrder, key.CreatedAtUtc, key.UpdatedAtUtc);
    }

    private sealed class FakeExamSectionRepository : IExamSectionRepository
    {
        private readonly TestContext _context;
        public FakeExamSectionRepository(TestContext context) => _context = context;

        public Task<IReadOnlyList<ExamSectionData>> GetListAsync(
            Guid examId, Guid versionId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<ExamSectionData>>([ToData()]);

        public Task<ExamSectionData?> GetDetailAsync(
            Guid examId, Guid versionId, Guid sectionId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<ExamSectionData?>(
                examId == _context.Exam.Id && versionId == _context.Version.Id && sectionId == _context.Section.Id
                    ? ToData()
                    : null);

        public Task<ExamSection?> GetTrackedAsync(
            Guid versionId, Guid sectionId, CancellationToken cancellationToken = default) =>
            Task.FromResult(versionId == _context.Version.Id && sectionId == _context.Section.Id
                ? _context.Section
                : null);

        public Task<IReadOnlyList<ExamSection>> GetTrackedListAsync(
            Guid versionId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<ExamSection>>([_context.Section]);

        public Task<int?> GetMaximumDisplayOrderAsync(
            Guid versionId, CancellationToken cancellationToken = default) => Task.FromResult<int?>(0);
        public void Add(ExamSection section) { }
        public void Remove(ExamSection section) { }

        private ExamSectionData ToData() => new(
            _context.Section.Id, _context.Version.Id, _context.Exam.Id,
            _context.Section.Kind, _context.Section.Title, _context.Section.Instructions,
            _context.Section.StimulusText, _context.Section.MediaUrl, _context.Section.DisplayOrder,
            _context.QuestionRepository.Questions.Count,
            _context.QuestionRepository.Questions.Where(q => q.Type != QuestionType.Group).Sum(q => q.Points),
            _context.Section.CreatedAtUtc, _context.Section.UpdatedAtUtc);
    }

    private sealed class FakeExamVersionRepository : IExamVersionRepository
    {
        private readonly TestContext _context;
        public FakeExamVersionRepository(TestContext context) => _context = context;

        public Task<ExamVersionRepositoryPage> GetPageAsync(
            Guid examId, ExamVersionPageQuery query, CancellationToken cancellationToken = default) =>
            Task.FromResult(new ExamVersionRepositoryPage([], 0));
        public Task<ExamVersionData?> GetDetailAsync(
            Guid examId, Guid versionId, CancellationToken cancellationToken = default) =>
            Task.FromResult<ExamVersionData?>(examId == _context.Exam.Id && versionId == _context.Version.Id
                ? ToData()
                : null);
        public Task<ExamVersionData?> GetCurrentPublishedAsync(
            Guid examId, CancellationToken cancellationToken = default) => Task.FromResult<ExamVersionData?>(null);
        public Task<ExamVersion?> GetTrackedAsync(
            Guid examId, Guid versionId, CancellationToken cancellationToken = default) =>
            Task.FromResult(examId == _context.Exam.Id && versionId == _context.Version.Id
                ? _context.Version
                : null);
        public Task<ExamVersion?> GetTrackedCurrentPublishedAsync(
            Guid examId, Guid excludedVersionId, CancellationToken cancellationToken = default) =>
            Task.FromResult<ExamVersion?>(null);
        public Task<ExamVersionData?> GetSourceForCloneAsync(
            Guid examId, Guid sourceVersionId, CancellationToken cancellationToken = default) =>
            Task.FromResult<ExamVersionData?>(null);
        public Task<Exam?> GetExamForUpdateAsync(
            Guid examId, CancellationToken cancellationToken = default) =>
            Task.FromResult(examId == _context.Exam.Id ? _context.Exam : null);
        public Task<bool> ExamExistsAsync(
            Guid examId, CancellationToken cancellationToken = default) =>
            Task.FromResult(examId == _context.Exam.Id);
        public void Add(ExamVersion version) { }
        public void Remove(ExamVersion version) { }

        private ExamVersionData ToData() => new(
            _context.Version.Id, _context.Exam.Id, _context.Version.VersionNumber,
            _context.Version.Status, _context.Version.Title, _context.Version.Description,
            _context.Version.Instructions, _context.Version.DurationMinutes,
            _context.Version.TotalScore, _context.Version.CreatedByUserId,
            _context.Version.PublishedAtUtc, _context.Version.RetiredAtUtc,
            _context.Version.CreatedAtUtc, _context.Version.UpdatedAtUtc);
    }

    private sealed class FakeUnitOfWork : IUnitOfWork
    {
        public bool ThrowConflict { get; set; }
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => Task.FromResult(1);

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
