using ExamForge.Application.Abstractions;
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

    public Task<bool> IsReadyAsync(
        Guid versionId,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.ExamSections
            .AsNoTracking()
            .AnyAsync(
                section => section.ExamVersionId == versionId && section.Questions.Any(),
                cancellationToken);
    }
}