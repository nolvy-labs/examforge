using ExamForge.Application.Abstractions;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Exams;

public sealed class ExamVersionContentCloner : IExamVersionContentCloner
{
    private readonly ExamForgeDbContext _dbContext;

    public ExamVersionContentCloner(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ExamVersionContentCloneResult> CloneAsync(
        Guid sourceVersionId,
        Guid targetVersionId,
        CancellationToken cancellationToken = default)
    {
        var sourceHasSections = await _dbContext.ExamSections
            .AsNoTracking()
            .AnyAsync(section => section.ExamVersionId == sourceVersionId, cancellationToken);

        if (!sourceHasSections)
        {
            return ExamVersionContentCloneResult.Success;
        }

        // TODO: Replace this guard with a same-transaction deep clone that creates new IDs,
        // remaps ParentQuestionId, clones options/answer keys, and recalculates TotalScore.
        return ExamVersionContentCloneResult.ContentCloneNotAvailable;
    }
}