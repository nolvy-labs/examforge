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

public sealed class AdminQuestionRepository : IAdminQuestionRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public AdminQuestionRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<QuestionData>> GetListAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        CancellationToken cancellationToken = default)
    {
        return await Project(_dbContext.Questions
            .AsNoTracking()
            .Where(question =>
                question.ExamSection.ExamVersion.ExamId == examId &&
                question.ExamSection.ExamVersionId == versionId &&
                question.ExamSectionId == sectionId)
            .OrderBy(question => question.ParentQuestionId == null
                ? question.DisplayOrder
                : question.ParentQuestion!.DisplayOrder)
            .ThenBy(question => question.ParentQuestionId == null ? 0 : 1)
            .ThenBy(question => question.DisplayOrder)
            .ThenBy(question => question.Id))
            .ToListAsync(cancellationToken);
    }

    public async Task<QuestionDetailData?> GetDetailAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken = default)
    {
        var question = await Project(_dbContext.Questions
            .AsNoTracking()
            .Where(item =>
                item.ExamSection.ExamVersion.ExamId == examId &&
                item.ExamSection.ExamVersionId == versionId &&
                item.ExamSectionId == sectionId &&
                item.Id == questionId))
            .SingleOrDefaultAsync(cancellationToken);

        if (question is null)
        {
            return null;
        }

        var options = question.Type is QuestionType.MultipleChoiceSingle or QuestionType.MultipleChoiceMultiple
            ? await _dbContext.QuestionOptions
                .AsNoTracking()
                .Where(option => option.QuestionId == questionId)
                .OrderBy(option => option.DisplayOrder)
                .ThenBy(option => option.Id)
                .Select(option => new QuestionOptionData(
                    option.Id,
                    option.QuestionId,
                    option.Label,
                    option.Text,
                    option.IsCorrect,
                    option.DisplayOrder,
                    option.Explanation,
                    option.CreatedAtUtc,
                    option.UpdatedAtUtc))
                .ToListAsync(cancellationToken)
            : [];
        var answerKeys = question.Type == QuestionType.FillBlank
            ? await _dbContext.FillAnswerKeys
                .AsNoTracking()
                .Where(key => key.QuestionId == questionId)
                .OrderBy(key => key.DisplayOrder)
                .ThenBy(key => key.Id)
                .Select(key => new FillAnswerKeyData(
                    key.Id,
                    key.QuestionId,
                    key.BlankKey,
                    key.AcceptedAnswer,
                    key.IsCaseSensitive,
                    key.DisplayOrder,
                    key.CreatedAtUtc,
                    key.UpdatedAtUtc))
                .ToListAsync(cancellationToken)
            : [];

        return new QuestionDetailData(question, options, answerKeys);
    }

    public Task<Question?> GetTrackedAsync(
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken = default)
    {
        return IncludeContent(_dbContext.Questions)
            .FirstOrDefaultAsync(
                question => question.ExamSectionId == sectionId && question.Id == questionId,
                cancellationToken);
    }

    public async Task<IReadOnlyList<Question>> GetTrackedSiblingsAsync(
        Guid sectionId,
        Guid? parentQuestionId,
        CancellationToken cancellationToken = default)
    {
        return await IncludeContent(_dbContext.Questions)
            .Where(question =>
                question.ExamSectionId == sectionId &&
                question.ParentQuestionId == parentQuestionId)
            .OrderBy(question => question.DisplayOrder)
            .ThenBy(question => question.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Question>> GetTrackedChildrenAsync(
        Guid sectionId,
        Guid parentQuestionId,
        CancellationToken cancellationToken = default)
    {
        return await IncludeContent(_dbContext.Questions)
            .Where(question =>
                question.ExamSectionId == sectionId &&
                question.ParentQuestionId == parentQuestionId)
            .OrderBy(question => question.DisplayOrder)
            .ThenBy(question => question.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<int?> GetMaximumDisplayOrderAsync(
        Guid sectionId,
        Guid? parentQuestionId,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.Questions
            .Where(question =>
                question.ExamSectionId == sectionId &&
                question.ParentQuestionId == parentQuestionId)
            .MaxAsync(question => (int?)question.DisplayOrder, cancellationToken);
    }

    public async Task<decimal> GetVersionTotalScoreAsync(
        Guid versionId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Questions
            .Where(question =>
                question.ExamSection.ExamVersionId == versionId &&
                question.Type != QuestionType.Group)
            .SumAsync(question => (decimal?)question.Points, cancellationToken) ?? 0m;
    }

    public void Add(Question question) => _dbContext.Questions.Add(question);
    public void Remove(Question question) => _dbContext.Questions.Remove(question);
    public void RemoveRange(IEnumerable<Question> questions) => _dbContext.Questions.RemoveRange(questions);

    private static IQueryable<Question> IncludeContent(IQueryable<Question> query)
    {
        return query
            .Include(question => question.ChildQuestions)
            .Include(question => question.Options)
            .Include(question => question.FillAnswerKeys)
            .AsSplitQuery();
    }

    private static IQueryable<QuestionData> Project(IQueryable<Question> query)
    {
        return query.Select(question => new QuestionData(
                question.Id,
                question.ExamSectionId,
                question.ParentQuestionId,
                question.Type,
                question.Prompt,
                question.Explanation,
                question.Points,
                question.DisplayOrder,
                question.ChildQuestions.Count,
                question.Options.Count,
                question.FillAnswerKeys.Count,
                question.Type == QuestionType.Group
                    ? question.ChildQuestions.Any()
                    : question.Type == QuestionType.FillBlank
                        ? question.FillAnswerKeys.Any()
                        : question.Type == QuestionType.MultipleChoiceSingle
                            ? question.Options.Count >= 2 && question.Options.Count(option => option.IsCorrect) == 1
                            : question.Options.Count >= 2 && question.Options.Any(option => option.IsCorrect),
                question.CreatedAtUtc,
                question.UpdatedAtUtc));
    }
}