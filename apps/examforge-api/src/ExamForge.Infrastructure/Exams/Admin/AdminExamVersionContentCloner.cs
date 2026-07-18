using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Application.Admin.Exams.Services;
using ExamForge.Application.Admin.Exams.Utils;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Exams.Admin;

public sealed class AdminExamVersionContentCloner : IAdminExamVersionContentCloner
{
    private readonly ExamForgeDbContext _dbContext;

    public AdminExamVersionContentCloner(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task CloneAsync(
        Guid sourceVersionId,
        Guid targetVersionId,
        CancellationToken cancellationToken = default)
    {
        var target = _dbContext.ExamVersions.Local.Single(version => version.Id == targetVersionId);
        var sourceSections = await _dbContext.ExamSections
            .AsNoTrackingWithIdentityResolution()
            .Where(section => section.ExamVersionId == sourceVersionId)
            .Include(section => section.Questions)
            .ThenInclude(question => question.Options)
            .Include(section => section.Questions)
            .ThenInclude(question => question.FillAnswerKeys)
            .AsSplitQuery()
            .OrderBy(section => section.DisplayOrder)
            .ThenBy(section => section.Id)
            .ToListAsync(cancellationToken);
        var source = sourceSections.Select(section => new CloneSectionSource(
            section.Id,
            section.Kind,
            section.Title,
            section.Instructions,
            section.StimulusText,
            section.MediaUrl,
            section.DisplayOrder,
            section.MetadataJson,
            section.Questions.Select(question => new CloneQuestionSource(
                question.Id,
                question.ParentQuestionId,
                question.Type,
                question.Prompt,
                question.Explanation,
                question.Points,
                question.DisplayOrder,
                question.MetadataJson,
                question.Options.Select(option => new CloneOptionSource(
                    option.Id,
                    option.Text,
                    option.Label,
                    option.IsCorrect,
                    option.Explanation,
                    option.DisplayOrder)).ToList(),
                question.FillAnswerKeys.Select(key => new CloneAnswerKeySource(
                    key.Id,
                    key.AcceptedAnswer,
                    key.NormalizedAnswer,
                    key.IsCaseSensitive,
                    key.DisplayOrder)).ToList())).ToList())).ToList();
        var plan = ExamVersionContentCloneFactory.Create(targetVersionId, source);

        _dbContext.ExamSections.AddRange(plan.Sections);
        _dbContext.Questions.AddRange(plan.Questions);
        _dbContext.QuestionOptions.AddRange(plan.Options);
        _dbContext.FillAnswerKeys.AddRange(plan.AnswerKeys);
        target.InitializeTotalScore(plan.TotalScore);
    }
}
