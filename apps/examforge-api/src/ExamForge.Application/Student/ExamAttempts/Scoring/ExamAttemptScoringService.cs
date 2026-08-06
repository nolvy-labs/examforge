using ExamForge.Application.Common;
using ExamForge.Application.Student.ExamAttempts.Models;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Student.ExamAttempts.Scoring;

public enum ExamAttemptScoringError
{
    InvalidConfiguration
}

public sealed class ExamAttemptScoringService
{
    public Result<ExamAttemptScore, ExamAttemptScoringError> Calculate(ExamAttempt attempt)
    {
        var grades = new List<ExamAttemptAnswerGrade>();

        foreach (var answer in attempt.Answers)
        {
            var result = GradeAnswer(answer);
            if (!result.IsSuccess)
            {
                return Result<ExamAttemptScore, ExamAttemptScoringError>.Failure(result.Error);
            }

            grades.Add(result.Value!);
        }

        return Result<ExamAttemptScore, ExamAttemptScoringError>.Success(new ExamAttemptScore(
            grades.Sum(grade => grade.AwardedScore),
            grades.Sum(grade => grade.MaximumScore),
            grades));
    }

    public void Apply(
        ExamAttempt attempt,
        ExamAttemptScore score,
        DateTimeOffset submittedAtUtc)
    {
        attempt.Submit(
            score.Answers.Select(grade => new ExamAttemptAnswerGradeResult(
                    grade.Answer.QuestionId,
                    grade.AwardedScore,
                    grade.MaximumScore,
                    grade.Status))
                .ToList(),
            score.Score,
            score.MaximumScore,
            submittedAtUtc);
    }

    private static Result<ExamAttemptAnswerGrade, ExamAttemptScoringError> GradeAnswer(
        ExamAttemptAnswer answer)
    {
        var question = answer.Question;
        return question.Type switch
        {
            QuestionType.MultipleChoiceSingle => GradeSingleChoice(answer),
            QuestionType.MultipleChoiceMultiple => GradeMultipleChoice(answer),
            QuestionType.FillBlank => GradeFillAnswer(answer),
            _ => Result<ExamAttemptAnswerGrade, ExamAttemptScoringError>.Failure(
                ExamAttemptScoringError.InvalidConfiguration)
        };
    }

    private static Result<ExamAttemptAnswerGrade, ExamAttemptScoringError> GradeSingleChoice(
        ExamAttemptAnswer answer)
    {
        var correctIds = answer.Question.Options
            .Where(option => option.IsCorrect)
            .Select(option => option.Id)
            .ToHashSet();
        if (correctIds.Count != 1)
        {
            return Result<ExamAttemptAnswerGrade, ExamAttemptScoringError>.Failure(
                ExamAttemptScoringError.InvalidConfiguration);
        }

        var selectedIds = answer.SelectedOptions
            .Select(selection => selection.QuestionOptionId)
            .ToHashSet();
        if (selectedIds.Count == 0)
        {
            return Success(Grade(
                answer,
                0m,
                ExamAttemptAnswerGradingStatus.Unanswered));
        }

        var correct = selectedIds.SetEquals(correctIds);
        return Success(Grade(
            answer,
            correct ? answer.Question.Points : 0m,
            correct
                ? ExamAttemptAnswerGradingStatus.Correct
                : ExamAttemptAnswerGradingStatus.Incorrect));
    }

    private static Result<ExamAttemptAnswerGrade, ExamAttemptScoringError> GradeMultipleChoice(
        ExamAttemptAnswer answer)
    {
        var correctOptionIds = answer.Question.Options
            .Where(option => option.IsCorrect)
            .Select(option => option.Id)
            .ToHashSet();
        if (correctOptionIds.Count == 0)
        {
            return Result<ExamAttemptAnswerGrade, ExamAttemptScoringError>.Failure(
                ExamAttemptScoringError.InvalidConfiguration);
        }

        var selectedIds = answer.SelectedOptions
            .Select(selection => selection.QuestionOptionId)
            .ToHashSet();
        if (selectedIds.Count == 0)
        {
            return Success(Grade(answer, 0m, ExamAttemptAnswerGradingStatus.Unanswered));
        }

        var correctSelections = selectedIds.Count(correctOptionIds.Contains);
        var incorrectSelections = selectedIds.Count - correctSelections;
        var creditRatio = Math.Max(
            0m,
            (correctSelections - incorrectSelections) / (decimal)correctOptionIds.Count);
        var status = creditRatio switch
        {
            1m => ExamAttemptAnswerGradingStatus.Correct,
            > 0m => ExamAttemptAnswerGradingStatus.PartiallyCorrect,
            _ => ExamAttemptAnswerGradingStatus.Incorrect
        };
        return Success(Grade(answer, answer.Question.Points * creditRatio, status));
    }

    private static Result<ExamAttemptAnswerGrade, ExamAttemptScoringError> GradeFillAnswer(
        ExamAttemptAnswer answer)
    {
        if (answer.Question.FillAnswerKeys.Count == 0)
        {
            return Result<ExamAttemptAnswerGrade, ExamAttemptScoringError>.Failure(
                ExamAttemptScoringError.InvalidConfiguration);
        }

        if (string.IsNullOrWhiteSpace(answer.TextAnswer))
        {
            return Success(Grade(
                answer,
                0m,
                ExamAttemptAnswerGradingStatus.Unanswered));
        }

        var correct = answer.Question.FillAnswerKeys.Any(key =>
            FillAnswerNormalizer.Normalize(answer.TextAnswer, key.IsCaseSensitive) ==
            key.NormalizedAnswer);
        return Success(Grade(
            answer,
            correct ? answer.Question.Points : 0m,
            correct
                ? ExamAttemptAnswerGradingStatus.Correct
                : ExamAttemptAnswerGradingStatus.Incorrect));
    }

    private static ExamAttemptAnswerGrade Grade(
        ExamAttemptAnswer answer,
        decimal awardedScore,
        ExamAttemptAnswerGradingStatus status) =>
        new(answer, awardedScore, answer.Question.Points, status);

    private static Result<ExamAttemptAnswerGrade, ExamAttemptScoringError> Success(
        ExamAttemptAnswerGrade grade) =>
        Result<ExamAttemptAnswerGrade, ExamAttemptScoringError>.Success(grade);
}