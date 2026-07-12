using ExamForge.Application.Abstractions;
using ExamForge.Infrastructure.Persistence;

namespace ExamForge.Infrastructure.Exams;

public sealed class FillAnswerKeyRepository : IFillAnswerKeyRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public FillAnswerKeyRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }
}
