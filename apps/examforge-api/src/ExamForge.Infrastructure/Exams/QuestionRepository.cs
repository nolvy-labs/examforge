using ExamForge.Application.Abstractions.Exams;
using ExamForge.Infrastructure.Persistence;

namespace ExamForge.Infrastructure.Exams;

public sealed class QuestionRepository : IQuestionRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public QuestionRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }
}
