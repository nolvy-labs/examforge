using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Application.Admin.Exams.Services;
using ExamForge.Application.Admin.Exams.Utils;
using ExamForge.Domain.Common;
using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Exams.Admin;

public sealed class AdminExamVersionPublishReadinessChecker : IAdminExamVersionPublishReadinessChecker
{
    private readonly ExamForgeDbContext _dbContext;

    public AdminExamVersionPublishReadinessChecker(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> IsReadyAsync(
        Guid versionId,
        CancellationToken cancellationToken = default)
    {
        var version = await _dbContext.ExamVersions
            .AsNoTrackingWithIdentityResolution()
            .Where(item => item.Id == versionId)
            .Include(item => item.Sections)
            .ThenInclude(section => section.Questions)
            .ThenInclude(question => question.Options)
            .Include(item => item.Sections)
            .ThenInclude(section => section.Questions)
            .ThenInclude(question => question.FillAnswerKeys)
            .AsSplitQuery()
            .SingleOrDefaultAsync(cancellationToken);

        if (version is null)
        {
            return false;
        }

        var sections = version.Sections
            .Select(section => new PublicationSectionState(section.Questions
                .Select(question => new PublicationQuestionState(
                    question.Id,
                    question.ParentQuestionId,
                    question.Type,
                    question.Points,
                    question.Options.Count,
                    question.Options.Count(option => option.IsCorrect),
                    question.FillAnswerKeys.Count,
                    HasValidQuestionContent(question)))
                .ToList(),
                HasValidSectionContent(section)))
            .ToList();
        return ExamVersionPublicationReadiness.IsReady(
            version.TotalScore,
            sections,
            HasValidVersionMetadata(version));
    }

    private static bool HasValidVersionMetadata(ExamVersion version) =>
        !string.IsNullOrWhiteSpace(version.Title) &&
        TextNormalizer.NormalizeName(version.Title).Length <= ExamVersionConstraints.TitleMaxLength &&
        version.Description.Trim().Length <= ExamVersionConstraints.DescriptionMaxLength &&
        version.Instructions.Trim().Length <= ExamVersionConstraints.InstructionsMaxLength &&
        (version.DurationMinutes is null ||
            version.DurationMinutes is > 0 and <= ExamVersionConstraints.MaxDurationMinutes);

    private static bool HasValidSectionContent(ExamSection section)
    {
        if (string.IsNullOrWhiteSpace(section.Title) ||
            TextNormalizer.NormalizeName(section.Title).Length > ExamSectionConstraints.TitleMaxLength ||
            section.Instructions.Trim().Length > ExamSectionConstraints.InstructionsMaxLength ||
            section.StimulusText is not null &&
                (string.IsNullOrWhiteSpace(section.StimulusText) ||
                 section.StimulusText.Trim().Length > ExamSectionConstraints.StimulusTextMaxLength))
        {
            return false;
        }

        if (section.MediaUrl is null)
        {
            return true;
        }

        var mediaUrl = section.MediaUrl.Trim();
        return mediaUrl.Length > 0 &&
            mediaUrl.Length <= ExamSectionConstraints.MediaUrlMaxLength &&
            Uri.TryCreate(mediaUrl, UriKind.Absolute, out var uri) &&
            (uri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase) ||
             uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase));
    }

    private static bool HasValidQuestionContent(Question question)
    {
        if (string.IsNullOrWhiteSpace(question.Prompt) ||
            TextNormalizer.NormalizeName(question.Prompt).Length > QuestionConstraints.PromptMaxLength ||
            question.Explanation is not null &&
                (string.IsNullOrWhiteSpace(question.Explanation) ||
                 question.Explanation.Trim().Length > QuestionConstraints.ExplanationMaxLength) ||
            question.Options.Any(option =>
                string.IsNullOrWhiteSpace(option.Text) ||
                option.Text.Trim().Length > QuestionOptionConstraints.TextMaxLength ||
                option.Label is not null &&
                    (string.IsNullOrWhiteSpace(option.Label) ||
                     option.Label.Trim().Length > QuestionOptionConstraints.LabelMaxLength) ||
                option.Explanation is not null &&
                    (string.IsNullOrWhiteSpace(option.Explanation) ||
                     option.Explanation.Trim().Length > QuestionOptionConstraints.ExplanationMaxLength)) ||
            question.FillAnswerKeys.Any(answer =>
                string.IsNullOrWhiteSpace(answer.AcceptedAnswer) ||
                FillAnswerNormalizer.Normalize(answer.AcceptedAnswer, true).Length >
                    FillAnswerKeyConstraints.AcceptedAnswerMaxLength))
        {
            return false;
        }

        var answers = question.FillAnswerKeys.ToList();
        for (var left = 0; left < answers.Count; left++)
        {
            for (var right = left + 1; right < answers.Count; right++)
            {
                if (FillAnswerNormalizer.Conflicts(
                        answers[left].AcceptedAnswer,
                        answers[left].IsCaseSensitive,
                        answers[right].AcceptedAnswer,
                        answers[right].IsCaseSensitive))
                {
                    return false;
                }
            }
        }

        return true;
    }
}