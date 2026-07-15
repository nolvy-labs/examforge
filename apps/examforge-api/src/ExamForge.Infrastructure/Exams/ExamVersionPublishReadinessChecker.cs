using ExamForge.Application.Abstractions;
using ExamForge.Application.Exams;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Exams;

public sealed class ExamVersionPublishReadinessChecker : IExamVersionPublishReadinessChecker
{
    private readonly ExamForgeDbContext _dbContext;

    public ExamVersionPublishReadinessChecker(ExamForgeDbContext dbContext)
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
                    question.FillAnswerKeys.Count))
                .ToList()))
            .ToList();
        return ExamVersionPublicationReadiness.IsReady(version.TotalScore, sections);
    }
}
