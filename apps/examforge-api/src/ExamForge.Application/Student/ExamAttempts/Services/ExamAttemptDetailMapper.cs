using System.Text.Json;

using ExamForge.Application.Student.ExamAttempts.Dtos;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Student.ExamAttempts.Services;

public sealed record ExamAttemptDetailVisibility(
    bool IncludeSolutions,
    bool IncludeGrading);

public static class ExamAttemptDetailMapper
{
    public static ExamAttemptDetailResponse Map(
        ExamAttempt attempt,
        DateTimeOffset nowUtc,
        ExamAttemptDetailVisibility visibility)
    {
        var answers = attempt.Answers.ToDictionary(answer => answer.QuestionId);
        var allQuestions = attempt.ExamVersion.Sections
            .SelectMany(section => section.Questions)
            .ToList();
        var children = allQuestions
            .Where(question => question.ParentQuestionId.HasValue)
            .GroupBy(question => question.ParentQuestionId!.Value)
            .ToDictionary(
                group => group.Key,
                group => group.OrderBy(question => question.DisplayOrder)
                    .ThenBy(question => question.Id)
                    .ToList());

        ExamAttemptQuestionResponse MapQuestion(Question question)
        {
            answers.TryGetValue(question.Id, out var answer);
            var answerResponse = answer is null
                ? null
                : new ExamAttemptAnswerResponse(
                    answer.TextAnswer,
                    answer.SelectedOptions
                        .Select(selection => selection.QuestionOptionId)
                        .Order()
                        .ToList(),
                    visibility.IncludeGrading ? answer.AwardedScore : null,
                    visibility.IncludeGrading ? answer.MaximumScore : null,
                    visibility.IncludeGrading ? answer.GradingStatus : null);
            var solution = visibility.IncludeSolutions
                ? new ExamAttemptSolutionResponse(
                    question.Explanation,
                    question.Options
                        .OrderBy(option => option.DisplayOrder)
                        .ThenBy(option => option.Id)
                        .Select(option => new ExamAttemptOptionSolutionResponse(
                            option.Id,
                            option.IsCorrect,
                            option.Explanation))
                        .ToList(),
                    question.FillAnswerKeys
                        .OrderBy(key => key.DisplayOrder)
                        .ThenBy(key => key.Id)
                        .Select(key => new ExamAttemptFillAnswerSolutionResponse(
                            key.BlankKey,
                            key.AcceptedAnswer,
                            key.IsCaseSensitive,
                            key.DisplayOrder))
                        .ToList())
                : null;
            return new ExamAttemptQuestionResponse(
                question.Id,
                question.ParentQuestionId,
                question.Type,
                question.Prompt,
                question.Points,
                question.DisplayOrder,
                ParseMetadata(question.MetadataJson),
                question.Options
                    .OrderBy(option => option.DisplayOrder)
                    .ThenBy(option => option.Id)
                    .Select(option => new ExamAttemptOptionResponse(
                        option.Id,
                        option.Label,
                        option.Text,
                        option.DisplayOrder))
                    .ToList(),
                children.GetValueOrDefault(question.Id, []).Select(MapQuestion).ToList(),
                answerResponse,
                solution);
        }

        var percentage = visibility.IncludeGrading
            ? CalculatePercentage(attempt.Score, attempt.MaximumScore)
            : null;
        long? remainingSeconds = attempt.Status == ExamAttemptStatus.InProgress &&
            attempt.Mode == ExamAttemptMode.Exam &&
            attempt.ExpiresAtUtc.HasValue
                ? (long)Math.Max(
                    0d,
                    Math.Ceiling((attempt.ExpiresAtUtc.Value - nowUtc).TotalSeconds))
                : null;
        return new ExamAttemptDetailResponse(
            attempt.Id,
            attempt.ExamId,
            attempt.ExamVersionId,
            attempt.Status,
            attempt.Mode,
            attempt.Revision,
            attempt.StartedAtUtc,
            attempt.ExpiresAtUtc,
            remainingSeconds,
            attempt.SubmittedAtUtc,
            attempt.AbandonedAtUtc,
            visibility.IncludeGrading ? attempt.Score : null,
            visibility.IncludeGrading ? attempt.MaximumScore : null,
            percentage,
            new ExamAttemptExamResponse(
                attempt.Exam.Title,
                attempt.Exam.Slug,
                attempt.Exam.Description,
                attempt.Exam.Type),
            new ExamAttemptVersionResponse(
                attempt.ExamVersion.VersionNumber,
                attempt.ExamVersion.Title,
                attempt.ExamVersion.Description,
                attempt.ExamVersion.Instructions,
                attempt.ExamVersion.DurationMinutes),
            attempt.ExamVersion.Sections
                .OrderBy(section => section.DisplayOrder)
                .ThenBy(section => section.Id)
                .Select(section => new ExamAttemptSectionResponse(
                    section.Id,
                    section.Kind,
                    section.Title,
                    section.Instructions,
                    section.StimulusText,
                    section.MediaUrl,
                    section.DisplayOrder,
                    ParseMetadata(section.MetadataJson),
                    section.Questions
                        .Where(question => question.ParentQuestionId is null)
                        .OrderBy(question => question.DisplayOrder)
                        .ThenBy(question => question.Id)
                        .Select(MapQuestion)
                        .ToList()))
                .ToList());
    }

    public static decimal? CalculatePercentage(decimal? score, decimal? maximumScore)
    {
        if (!score.HasValue || !maximumScore.HasValue)
        {
            return null;
        }

        return maximumScore.Value == 0m
            ? 0m
            : score.Value / maximumScore.Value * 100m;
    }

    private static JsonElement? ParseMetadata(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            return document.RootElement.Clone();
        }
        catch (JsonException)
        {
            return null;
        }
    }
}