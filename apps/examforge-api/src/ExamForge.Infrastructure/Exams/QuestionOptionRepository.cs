using ExamForge.Application.Abstractions;
using ExamForge.Application.Exams;
using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Exams;

public sealed class QuestionOptionRepository : IQuestionOptionRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public QuestionOptionRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<QuestionOptionData>> GetListAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken = default)
    {
        return await Project(Scoped(examId, versionId, sectionId, questionId))
            .OrderBy(option => option.DisplayOrder)
            .ThenBy(option => option.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<QuestionOptionData?> GetDetailAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        Guid optionId,
        CancellationToken cancellationToken = default)
    {
        return Project(Scoped(examId, versionId, sectionId, questionId))
            .SingleOrDefaultAsync(option => option.Id == optionId, cancellationToken);
    }

    public async Task<IReadOnlyList<QuestionOption>> GetTrackedListAsync(
        Guid questionId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.QuestionOptions
            .Where(option => option.QuestionId == questionId)
            .OrderBy(option => option.DisplayOrder)
            .ThenBy(option => option.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<int?> GetMaximumDisplayOrderAsync(
        Guid questionId,
        CancellationToken cancellationToken = default) =>
        _dbContext.QuestionOptions
            .Where(option => option.QuestionId == questionId)
            .MaxAsync(option => (int?)option.DisplayOrder, cancellationToken);

    public void Add(QuestionOption option) => _dbContext.QuestionOptions.Add(option);
    public void Remove(QuestionOption option) => _dbContext.QuestionOptions.Remove(option);

    private IQueryable<QuestionOption> Scoped(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId) =>
        _dbContext.QuestionOptions.AsNoTracking().Where(option =>
            option.QuestionId == questionId &&
            option.Question.ExamSectionId == sectionId &&
            option.Question.ExamSection.ExamVersionId == versionId &&
            option.Question.ExamSection.ExamVersion.ExamId == examId);

    private static IQueryable<QuestionOptionData> Project(IQueryable<QuestionOption> query) =>
        query.Select(option => new QuestionOptionData(
            option.Id,
            option.QuestionId,
            option.Label,
            option.Text,
            option.IsCorrect,
            option.DisplayOrder,
            option.Explanation,
            option.CreatedAtUtc,
            option.UpdatedAtUtc));
}
