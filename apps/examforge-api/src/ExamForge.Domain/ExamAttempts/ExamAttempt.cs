using ExamForge.Domain.Exams;
using ExamForge.Domain.Users;

namespace ExamForge.Domain.ExamAttempts;

public sealed class ExamAttempt
{
    private readonly List<ExamAttemptAnswer> _answers = [];

    private ExamAttempt() { }

    public ExamAttempt(
        Guid studentId,
        Guid examId,
        Guid examVersionId,
        ExamAttemptMode mode,
        DateTimeOffset startedAtUtc,
        DateTimeOffset? expiresAtUtc,
        IEnumerable<Guid> answerableQuestionIds)
    {
        if (!Enum.IsDefined(mode))
        {
            throw new ArgumentOutOfRangeException(nameof(mode));
        }

        Id = Guid.NewGuid();
        StudentId = studentId;
        ExamId = examId;
        ExamVersionId = examVersionId;
        Mode = mode;
        Status = ExamAttemptStatus.InProgress;
        StartedAtUtc = startedAtUtc;
        ExpiresAtUtc = mode == ExamAttemptMode.Exam ? expiresAtUtc : null;
        Revision = 1;
        CreatedAtUtc = startedAtUtc;
        UpdatedAtUtc = startedAtUtc;

        foreach (var questionId in answerableQuestionIds.Distinct())
        {
            _answers.Add(new ExamAttemptAnswer(Id, questionId, startedAtUtc));
        }
    }

    public Guid Id { get; private set; }
    public Guid StudentId { get; private set; }
    public Guid ExamId { get; private set; }
    public Guid ExamVersionId { get; private set; }
    public ExamAttemptMode Mode { get; private set; }
    public ExamAttemptStatus Status { get; private set; }
    public DateTimeOffset StartedAtUtc { get; private set; }
    public DateTimeOffset? ExpiresAtUtc { get; private set; }
    public DateTimeOffset? SubmittedAtUtc { get; private set; }
    public DateTimeOffset? AbandonedAtUtc { get; private set; }
    public decimal? Score { get; private set; }
    public decimal? MaximumScore { get; private set; }
    public long Revision { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset UpdatedAtUtc { get; private set; }

    public User Student { get; private set; } = null!;
    public Exam Exam { get; private set; } = null!;
    public ExamVersion ExamVersion { get; private set; } = null!;
    public IReadOnlyCollection<ExamAttemptAnswer> Answers => _answers;

    public bool IsExpired(DateTimeOffset nowUtc) =>
        Mode == ExamAttemptMode.Exam &&
        Status == ExamAttemptStatus.InProgress &&
        ExpiresAtUtc.HasValue &&
        nowUtc >= ExpiresAtUtc.Value;

    public void ApplyAnswers(
        IReadOnlyCollection<ExamAttemptAnswerUpdate> updates,
        DateTimeOffset updatedAtUtc)
    {
        ApplyAnswerValues(updates, updatedAtUtc);
        AdvanceRevision(updatedAtUtc);
    }

    private void ApplyAnswerValues(
        IReadOnlyCollection<ExamAttemptAnswerUpdate> updates,
        DateTimeOffset updatedAtUtc)
    {
        EnsureInProgress();
        var answerByQuestion = _answers.ToDictionary(answer => answer.QuestionId);
        if (updates.Select(update => update.QuestionId).Distinct().Count() != updates.Count ||
            updates.Any(update => !answerByQuestion.ContainsKey(update.QuestionId)) ||
            updates.Any(update =>
                update.SelectedOptionIds.Distinct().Count() !=
                update.SelectedOptionIds.Count))
        {
            throw new InvalidOperationException("The answer update set is invalid.");
        }

        foreach (var update in updates)
        {
            var answer = answerByQuestion[update.QuestionId];

            if (update.ReplaceText)
            {
                answer.ReplaceText(update.TextAnswer, updatedAtUtc);
            }

            if (update.ReplaceSelectedOptions)
            {
                answer.ReplaceSelectedOptions(
                    update.SelectedOptionIds,
                    updatedAtUtc);
            }
        }

    }

    public void Submit(
        IReadOnlyCollection<ExamAttemptAnswerGradeResult> grades,
        decimal score,
        decimal maximumScore,
        DateTimeOffset submittedAtUtc)
    {
        EnsureInProgress();
        if (score < 0m || maximumScore < 0m || score > maximumScore)
        {
            throw new ArgumentOutOfRangeException(nameof(score));
        }

        var gradeByQuestion = grades
            .GroupBy(grade => grade.QuestionId)
            .ToDictionary(group => group.Key, group => group.ToList());
        if (gradeByQuestion.Count != _answers.Count ||
            gradeByQuestion.Any(group => group.Value.Count != 1) ||
            _answers.Any(answer => !gradeByQuestion.ContainsKey(answer.QuestionId)) ||
            grades.Any(grade =>
                grade.AwardedScore < 0m ||
                grade.MaximumScore < 0m ||
                grade.AwardedScore > grade.MaximumScore) ||
            grades.Sum(grade => grade.AwardedScore) != score ||
            grades.Sum(grade => grade.MaximumScore) != maximumScore)
        {
            throw new InvalidOperationException(
                "Submission must include one grading result for every answer.");
        }

        foreach (var answer in _answers)
        {
            var grade = gradeByQuestion[answer.QuestionId][0];
            answer.ApplyGrading(
                grade.AwardedScore,
                grade.MaximumScore,
                grade.Status,
                submittedAtUtc);
        }

        Status = ExamAttemptStatus.Submitted;
        Score = score;
        MaximumScore = maximumScore;
        SubmittedAtUtc = submittedAtUtc;
        AdvanceRevision(submittedAtUtc);
    }

    public void Abandon(DateTimeOffset abandonedAtUtc)
    {
        EnsureInProgress();
        Status = ExamAttemptStatus.Abandoned;
        AbandonedAtUtc = abandonedAtUtc;
        AdvanceRevision(abandonedAtUtc);
    }

    private void EnsureInProgress()
    {
        if (Status != ExamAttemptStatus.InProgress)
        {
            throw new InvalidOperationException("Only an in-progress attempt can be changed.");
        }
    }

    private void AdvanceRevision(DateTimeOffset updatedAtUtc)
    {
        if (Revision == long.MaxValue)
        {
            throw new InvalidOperationException("The attempt revision is exhausted.");
        }

        Revision++;
        UpdatedAtUtc = updatedAtUtc;
    }
}
