using ExamForge.Application.Abstractions;
using ExamForge.Infrastructure.Persistence;

namespace ExamForge.Infrastructure.Exams;

public sealed class ExamSectionRepository : IExamSectionRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public ExamSectionRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }
}
