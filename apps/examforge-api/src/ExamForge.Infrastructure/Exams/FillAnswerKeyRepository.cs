using ExamForge.Application.Abstractions;
using ExamForge.Application.Exams;
using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Exams;

public sealed class FillAnswerKeyRepository : IFillAnswerKeyRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public FillAnswerKeyRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<FillAnswerKeyData>> GetListAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken = default)
    {
        return await Project(Scoped(examId, versionId, sectionId, questionId))
            .OrderBy(key => key.DisplayOrder)
            .ThenBy(key => key.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<FillAnswerKeyData?> GetDetailAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        Guid answerKeyId,
        CancellationToken cancellationToken = default)
    {
        return Project(Scoped(examId, versionId, sectionId, questionId))
            .SingleOrDefaultAsync(key => key.Id == answerKeyId, cancellationToken);
    }

    public async Task<IReadOnlyList<FillAnswerKey>> GetTrackedListAsync(
        Guid questionId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.FillAnswerKeys
            .Where(key => key.QuestionId == questionId)
            .OrderBy(key => key.DisplayOrder)
            .ThenBy(key => key.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<int?> GetMaximumDisplayOrderAsync(
        Guid questionId,
        CancellationToken cancellationToken = default) =>
        _dbContext.FillAnswerKeys
            .Where(key => key.QuestionId == questionId)
            .MaxAsync(key => (int?)key.DisplayOrder, cancellationToken);

    public void Add(FillAnswerKey answerKey) => _dbContext.FillAnswerKeys.Add(answerKey);
    public void Remove(FillAnswerKey answerKey) => _dbContext.FillAnswerKeys.Remove(answerKey);

    private IQueryable<FillAnswerKey> Scoped(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId) =>
        _dbContext.FillAnswerKeys.AsNoTracking().Where(key =>
            key.QuestionId == questionId &&
            key.Question.ExamSectionId == sectionId &&
            key.Question.ExamSection.ExamVersionId == versionId &&
            key.Question.ExamSection.ExamVersion.ExamId == examId);

    private static IQueryable<FillAnswerKeyData> Project(IQueryable<FillAnswerKey> query) =>
        query.Select(key => new FillAnswerKeyData(
            key.Id,
            key.QuestionId,
            key.BlankKey,
            key.AcceptedAnswer,
            key.IsCaseSensitive,
            key.DisplayOrder,
            key.CreatedAtUtc,
            key.UpdatedAtUtc));
}
