using ExamForge.Application.Abstractions.Exams;
using ExamForge.Infrastructure.Persistence;

namespace ExamForge.Infrastructure.Exams;

public sealed class ExamVersionRepository : IExamVersionRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public ExamVersionRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }
}
