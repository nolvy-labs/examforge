using ExamForge.Application.Abstractions;
using ExamForge.Infrastructure.Persistence;

namespace ExamForge.Infrastructure.Exams;

public sealed class ExamRepository : IExamRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public ExamRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }
}
