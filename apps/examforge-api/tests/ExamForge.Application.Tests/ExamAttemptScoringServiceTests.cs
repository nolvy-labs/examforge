using ExamForge.Application.Student.ExamAttempts.Scoring;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class ExamAttemptScoringServiceTests
{
    private readonly ExamAttemptScoringService _service = new();
    private static readonly DateTimeOffset Now =
        DateTimeOffset.Parse("2026-07-26T00:30:00Z");

    [Theory]
    [InlineData(true, ExamAttemptAnswerGradingStatus.Correct, 2)]
    [InlineData(false, ExamAttemptAnswerGradingStatus.Incorrect, 0)]
    public void Single_choice_is_graded_for_exact_correct_selection(
        bool chooseCorrect,
        ExamAttemptAnswerGradingStatus expectedStatus,
        int expectedScore)
    {
        var question = ExamAttemptTestFactory.Question(
            QuestionType.MultipleChoiceSingle,
            2m);
        var correct = ExamAttemptTestFactory.AddOption(question, true, 0);
        var wrong = ExamAttemptTestFactory.AddOption(question, false, 1);
        var attempt = ExamAttemptTestFactory.CreateAttempt(question);
        attempt.ApplyAnswers(
            [
                new ExamAttemptAnswerUpdate(
                    question.Id,
                    null,
                    [chooseCorrect ? correct.Id : wrong.Id],
                    false,
                    true)
            ],
            Now);

        var result = _service.Calculate(attempt);

        Assert.True(result.IsSuccess);
        var grade = Assert.Single(result.Value!.Answers);
        Assert.Equal(expectedScore, grade.AwardedScore);
        Assert.Equal(expectedStatus, grade.Status);
    }

    [Fact]
    public void Unanswered_single_choice_is_unanswered()
    {
        var question = ExamAttemptTestFactory.Question(
            QuestionType.MultipleChoiceSingle,
            2m);
        ExamAttemptTestFactory.AddOption(question, true, 0);
        var result = _service.Calculate(ExamAttemptTestFactory.CreateAttempt(question));

        Assert.Equal(
            ExamAttemptAnswerGradingStatus.Unanswered,
            Assert.Single(result.Value!.Answers).Status);
    }

    [Fact]
    public void Multiple_choice_awards_exact_partial_credit_without_early_rounding()
    {
        var question = ExamAttemptTestFactory.Question(
            QuestionType.MultipleChoiceMultiple,
            10m);
        var correct1 = ExamAttemptTestFactory.AddOption(question, true, 0);
        var correct2 = ExamAttemptTestFactory.AddOption(question, true, 1);
        ExamAttemptTestFactory.AddOption(question, true, 2);
        var wrong = ExamAttemptTestFactory.AddOption(question, false, 3);
        var attempt = ExamAttemptTestFactory.CreateAttempt(question);
        attempt.ApplyAnswers(
            [
                new ExamAttemptAnswerUpdate(
                    question.Id,
                    null,
                    [correct1.Id, correct2.Id, wrong.Id],
                    false,
                    true)
            ],
            Now);

        var grade = Assert.Single(_service.Calculate(attempt).Value!.Answers);

        Assert.Equal(10m * (1m / 3m), grade.AwardedScore);
        Assert.Equal(ExamAttemptAnswerGradingStatus.PartiallyCorrect, grade.Status);
    }

    [Fact]
    public void Multiple_choice_credit_is_never_negative_and_selecting_all_is_not_an_exploit()
    {
        var question = ExamAttemptTestFactory.Question(
            QuestionType.MultipleChoiceMultiple,
            4m);
        var correct = ExamAttemptTestFactory.AddOption(question, true, 0);
        var wrong1 = ExamAttemptTestFactory.AddOption(question, false, 1);
        var wrong2 = ExamAttemptTestFactory.AddOption(question, false, 2);
        var attempt = ExamAttemptTestFactory.CreateAttempt(question);
        attempt.ApplyAnswers(
            [
                new ExamAttemptAnswerUpdate(
                    question.Id,
                    null,
                    [correct.Id, wrong1.Id, wrong2.Id],
                    false,
                    true)
            ],
            Now);

        var grade = Assert.Single(_service.Calculate(attempt).Value!.Answers);

        Assert.Equal(0m, grade.AwardedScore);
        Assert.Equal(ExamAttemptAnswerGradingStatus.Incorrect, grade.Status);
    }

    [Fact]
    public void Multiple_choice_without_a_correct_option_is_a_controlled_error()
    {
        var question = ExamAttemptTestFactory.Question(
            QuestionType.MultipleChoiceMultiple);
        ExamAttemptTestFactory.AddOption(question, false, 0);

        var result = _service.Calculate(
            ExamAttemptTestFactory.CreateAttempt(question));

        Assert.False(result.IsSuccess);
        Assert.Equal(
            ExamAttemptScoringError.InvalidConfiguration,
            result.Error);
    }

    [Theory]
    [InlineData("  heLLo   WORLD  ", false, true)]
    [InlineData("  heLLo   WORLD  ", true, false)]
    [InlineData("", false, false)]
    public void Fill_answers_reuse_normalization_and_case_sensitivity(
        string answer,
        bool caseSensitive,
        bool correct)
    {
        var question = ExamAttemptTestFactory.Question(QuestionType.FillBlank, 3m);
        ExamAttemptTestFactory.AddFillKey(
            question,
            "Hello World",
            caseSensitive);
        var attempt = ExamAttemptTestFactory.CreateAttempt(question);
        attempt.ApplyAnswers(
            [
                new ExamAttemptAnswerUpdate(
                    question.Id,
                    answer,
                    [],
                    true,
                    false)
            ],
            Now);

        var grade = Assert.Single(_service.Calculate(attempt).Value!.Answers);

        Assert.Equal(correct ? 3m : 0m, grade.AwardedScore);
        Assert.Equal(
            string.IsNullOrWhiteSpace(answer)
                ? ExamAttemptAnswerGradingStatus.Unanswered
                : correct
                    ? ExamAttemptAnswerGradingStatus.Correct
                    : ExamAttemptAnswerGradingStatus.Incorrect,
            grade.Status);
    }

    [Fact]
    public void Empty_attempt_has_safe_zero_totals()
    {
        var result = _service.Calculate(
            ExamAttemptTestFactory.CreateAttempt());

        Assert.True(result.IsSuccess);
        Assert.Equal(0m, result.Value!.Score);
        Assert.Equal(0m, result.Value.MaximumScore);
    }
}