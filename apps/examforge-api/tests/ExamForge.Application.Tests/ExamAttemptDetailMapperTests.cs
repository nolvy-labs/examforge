using ExamForge.Application.Student.ExamAttempts.Services;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class ExamAttemptDetailMapperTests
{
    [Fact]
    public void Explicit_visibility_can_show_solutions_without_grading_unsubmitted_attempt()
    {
        var question = ExamAttemptTestFactory.Question(QuestionType.MultipleChoiceSingle, 2m);
        var correct = ExamAttemptTestFactory.AddOption(question, true, 0);
        var attempt = ExamAttemptTestFactory.CreateAttempt(ExamAttemptMode.Practice, question);

        var response = ExamAttemptDetailMapper.Map(
            attempt,
            attempt.StartedAtUtc,
            new(IncludeSolutions: true, IncludeGrading: false));

        var mappedQuestion = Assert.Single(Assert.Single(response.Sections).Questions);
        Assert.True(Assert.Single(mappedQuestion.Solution!.Options).IsCorrect);
        Assert.Equal(correct.Id, mappedQuestion.Solution.Options[0].OptionId);
        Assert.Null(mappedQuestion.Answer!.AwardedScore);
        Assert.Null(mappedQuestion.Answer.MaximumScore);
        Assert.Null(mappedQuestion.Answer.GradingStatus);
        Assert.Null(response.Score);
        Assert.Equal(ExamAttemptStatus.InProgress, attempt.Status);
    }

    [Fact]
    public void Student_visibility_keeps_solutions_hidden_for_in_progress_attempt()
    {
        var question = ExamAttemptTestFactory.Question(QuestionType.FillBlank);
        ExamAttemptTestFactory.AddFillKey(question, "answer", false);
        var attempt = ExamAttemptTestFactory.CreateAttempt(ExamAttemptMode.Practice, question);

        var response = ExamAttemptDetailMapper.Map(
            attempt,
            attempt.StartedAtUtc,
            new(IncludeSolutions: false, IncludeGrading: false));

        Assert.Null(Assert.Single(Assert.Single(response.Sections).Questions).Solution);
    }
}