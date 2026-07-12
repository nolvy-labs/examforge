using ExamForge.Application.Abstractions;

namespace ExamForge.Application.Exams;

public sealed class QuestionService
{
    private readonly IQuestionRepository _questionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public QuestionService(IQuestionRepository questionRepository, IUnitOfWork unitOfWork)
    {
        _questionRepository = questionRepository;
        _unitOfWork = unitOfWork;
    }
}
