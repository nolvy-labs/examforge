using ExamForge.Application.Abstractions;
using ExamForge.Infrastructure.Persistence;

namespace ExamForge.Infrastructure.ExamAttempts;

public sealed class ExamAttemptRepository : IExamAttemptRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public ExamAttemptRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }
}
