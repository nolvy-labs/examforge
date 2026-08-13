using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Application.Admin.Exams.Services;
using ExamForge.Application.Admin.Exams.Utils;
using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Exams.Admin;

public sealed class AdminFillAnswerKeyRepository : IAdminFillAnswerKeyRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public AdminFillAnswerKeyRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<FillAnswerKeyData?> GetDetailAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        Guid answerKeyId,
        CancellationToken cancellationToken = default)
    {
        return DetailQuery(examId, versionId, sectionId, questionId, answerKeyId)
            .SingleOrDefaultAsync(cancellationToken);
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

    private IQueryable<FillAnswerKeyData> DetailQuery(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        Guid answerKeyId)
    {
        var query = Scoped(examId, versionId, sectionId, questionId)
            .Where(key => key.Id == answerKeyId);

        return Project(query);
    }

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
