using ExamForge.Application.Abstractions;
using ExamForge.Infrastructure.Persistence;

namespace ExamForge.Infrastructure.ExamAttempts;

public sealed class ExamAttemptSelectedOptionRepository : IExamAttemptSelectedOptionRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public ExamAttemptSelectedOptionRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }
}
