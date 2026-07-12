using ExamForge.Application.Abstractions.Exams;
using ExamForge.Infrastructure.Persistence;

namespace ExamForge.Infrastructure.Exams;

public sealed class QuestionOptionRepository : IQuestionOptionRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public QuestionOptionRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }
}
