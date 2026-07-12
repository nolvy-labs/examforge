using ExamForge.Application.Abstractions;
using ExamForge.Infrastructure.Persistence;

namespace ExamForge.Infrastructure.ExamAttempts;

public sealed class ExamAttemptAnswerRepository : IExamAttemptAnswerRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public ExamAttemptAnswerRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }
}
