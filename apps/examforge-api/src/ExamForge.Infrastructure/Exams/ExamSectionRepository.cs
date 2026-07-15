using ExamForge.Application.Abstractions;
using ExamForge.Application.Exams;
using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Exams;

public sealed class ExamSectionRepository : IExamSectionRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public ExamSectionRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ExamSectionData>> GetListAsync(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken = default)
    {
        return await Project(_dbContext.ExamSections.AsNoTracking())
            .Where(section =>
                section.ExamId == examId && section.ExamVersionId == versionId)
            .OrderBy(section => section.DisplayOrder)
            .ThenBy(section => section.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<ExamSectionData?> GetDetailAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        CancellationToken cancellationToken = default)
    {
        return Project(_dbContext.ExamSections.AsNoTracking())
            .FirstOrDefaultAsync(
                section => section.ExamId == examId &&
                    section.ExamVersionId == versionId &&
                    section.Id == sectionId,
                cancellationToken);
    }

    public Task<ExamSection?> GetTrackedAsync(
        Guid versionId,
        Guid sectionId,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.ExamSections.FirstOrDefaultAsync(
            section => section.ExamVersionId == versionId && section.Id == sectionId,
            cancellationToken);
    }

    public async Task<IReadOnlyList<ExamSection>> GetTrackedListAsync(
        Guid versionId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.ExamSections
            .Where(section => section.ExamVersionId == versionId)
            .OrderBy(section => section.DisplayOrder)
            .ThenBy(section => section.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<int?> GetMaximumDisplayOrderAsync(
        Guid versionId,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.ExamSections
            .Where(section => section.ExamVersionId == versionId)
            .MaxAsync(section => (int?)section.DisplayOrder, cancellationToken);
    }

    public void Add(ExamSection section)
    {
        _dbContext.ExamSections.Add(section);
    }

    public void Remove(ExamSection section)
    {
        _dbContext.ExamSections.Remove(section);
    }

    private static IQueryable<ExamSectionData> Project(IQueryable<ExamSection> query)
    {
        return query.Select(section => new ExamSectionData(
            section.Id,
            section.ExamVersionId,
            section.ExamVersion.ExamId,
            section.Kind,
            section.Title,
            section.Instructions,
            section.StimulusText,
            section.MediaUrl,
            section.DisplayOrder,
            section.Questions.Count(question => question.Type != QuestionType.Group),
            section.Questions
                .Where(question => question.Type != QuestionType.Group)
                .Sum(question => (decimal?)question.Points) ?? 0m,
            section.CreatedAtUtc,
            section.UpdatedAtUtc));
    }
}