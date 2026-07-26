using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class ExamAttemptDomainTests
{
    [Fact]
    public void Creation_initializes_only_requested_leaf_answers_without_selections()
    {
        var group = ExamAttemptTestFactory.Question(QuestionType.Group, 0m);
        var leaf = ExamAttemptTestFactory.Question(
            QuestionType.FillBlank,
            parentQuestionId: group.Id);
        var attempt = ExamAttemptTestFactory.CreateAttempt(group, leaf);

        var answer = Assert.Single(attempt.Answers);
        Assert.Equal(leaf.Id, answer.QuestionId);
        Assert.Null(answer.TextAnswer);
        Assert.Empty(answer.SelectedOptions);
        Assert.Equal(ExamAttemptStatus.InProgress, attempt.Status);
        Assert.Equal(1, attempt.Revision);
    }

    [Fact]
    public void Successful_lifecycle_actions_increment_revision_exactly_once()
    {
        var question = ExamAttemptTestFactory.Question(QuestionType.FillBlank);
        var attempt = ExamAttemptTestFactory.CreateAttempt(question);
        var now = DateTimeOffset.Parse("2026-07-26T00:10:00Z");

        attempt.ApplyAnswers([], now);
        Assert.Equal(2, attempt.Revision);

        attempt.Submit(
            [
                new ExamAttemptAnswerGradeResult(
                    question.Id,
                    1m,
                    1m,
                    ExamAttemptAnswerGradingStatus.Correct)
            ],
            1m,
            1m,
            now);

        Assert.Equal(3, attempt.Revision);
        Assert.Equal(ExamAttemptStatus.Submitted, attempt.Status);
        Assert.Throws<InvalidOperationException>(() => attempt.Abandon(now));
    }

    [Fact]
    public void Abandonment_is_terminal_and_does_not_create_grading()
    {
        var attempt = ExamAttemptTestFactory.CreateAttempt(
            ExamAttemptTestFactory.Question(QuestionType.FillBlank));
        var now = DateTimeOffset.Parse("2026-07-26T00:10:00Z");

        attempt.Abandon(now);

        Assert.Equal(ExamAttemptStatus.Abandoned, attempt.Status);
        Assert.Equal(2, attempt.Revision);
        Assert.Equal(now, attempt.AbandonedAtUtc);
        Assert.Null(attempt.Score);
        Assert.All(attempt.Answers, answer =>
        {
            Assert.Null(answer.AwardedScore);
            Assert.Null(answer.MaximumScore);
            Assert.Null(answer.GradingStatus);
        });
    }
}
