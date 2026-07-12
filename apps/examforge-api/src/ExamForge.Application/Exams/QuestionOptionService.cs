using ExamForge.Application.Abstractions.Exams;
using ExamForge.Application.Abstractions.Persistence;

namespace ExamForge.Application.Exams;

public sealed class QuestionOptionService
{
    private readonly IQuestionOptionRepository _questionOptionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public QuestionOptionService(IQuestionOptionRepository questionOptionRepository, IUnitOfWork unitOfWork)
    {
        _questionOptionRepository = questionOptionRepository;
        _unitOfWork = unitOfWork;
    }
}
