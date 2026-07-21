using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Exams.Admin;

public sealed class AdminExamVersionContentBatchRepository : IAdminExamVersionContentBatchRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public AdminExamVersionContentBatchRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ExamSection>> GetTrackedSectionsAsync(
        Guid versionId,
        IReadOnlyCollection<Guid> sectionIds,
        CancellationToken cancellationToken = default)
    {
        if (sectionIds.Count == 0)
            return [];

        return await _dbContext.ExamSections
            .Include(section => section.Questions)
            .Where(section => section.ExamVersionId == versionId && sectionIds.Contains(section.Id))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<QuestionOption>> GetTrackedOptionsAsync(
        Guid versionId,
        IReadOnlyCollection<Guid> optionIds,
        CancellationToken cancellationToken = default)
    {
        if (optionIds.Count == 0)
            return [];

        return await _dbContext.QuestionOptions
            .Where(option => optionIds.Contains(option.Id) &&
                option.Question.ExamSection.ExamVersionId == versionId)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<FillAnswerKey>> GetTrackedAnswerKeysAsync(
        Guid versionId,
        IReadOnlyCollection<Guid> answerKeyIds,
        CancellationToken cancellationToken = default)
    {
        if (answerKeyIds.Count == 0)
            return [];

        return await _dbContext.FillAnswerKeys
            .Where(answer => answerKeyIds.Contains(answer.Id) &&
                answer.Question.ExamSection.ExamVersionId == versionId)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Question>> GetTrackedQuestionsWithContentAsync(
        Guid versionId,
        IReadOnlyCollection<Guid> questionIds,
        CancellationToken cancellationToken = default)
    {
        if (questionIds.Count == 0)
            return [];

        return await IncludeContent(_dbContext.Questions)
            .AsSplitQuery()
            .Where(question => questionIds.Contains(question.Id) &&
                question.ExamSection.ExamVersionId == versionId)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Question>> GetTrackedQuestionsForScoreAsync(
        Guid versionId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Questions
            .Where(question => question.ExamSection.ExamVersionId == versionId)
            .ToListAsync(cancellationToken);
    }

    private static IQueryable<Question> IncludeContent(IQueryable<Question> query)
    {
        return query
            .Include(question => question.ChildQuestions)
                .ThenInclude(child => child.Options)
            .Include(question => question.ChildQuestions)
                .ThenInclude(child => child.FillAnswerKeys)
            .Include(question => question.Options)
            .Include(question => question.FillAnswerKeys);
    }
}