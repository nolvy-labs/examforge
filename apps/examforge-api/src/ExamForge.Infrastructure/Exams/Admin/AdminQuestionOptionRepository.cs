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

public sealed class AdminQuestionOptionRepository : IAdminQuestionOptionRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public AdminQuestionOptionRepository(ExamForgeDbContext dbContext)
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
        return await ListQuery(examId, versionId, sectionId, questionId)
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
        return DetailQuery(examId, versionId, sectionId, questionId, optionId)
            .SingleOrDefaultAsync(cancellationToken);
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

    private IQueryable<QuestionOptionData> ListQuery(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId)
    {
        var query = Scoped(examId, versionId, sectionId, questionId)
            .OrderBy(option => option.DisplayOrder)
            .ThenBy(option => option.Id);

        return Project(query);
    }

    private IQueryable<QuestionOptionData> DetailQuery(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        Guid optionId)
    {
        var query = Scoped(examId, versionId, sectionId, questionId)
            .Where(option => option.Id == optionId);

        return Project(query);
    }

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