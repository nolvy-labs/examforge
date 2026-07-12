using ExamForge.Application.Abstractions;

namespace ExamForge.Application.ExamAttempts;

public sealed class ExamAttemptAnswerService
{
    private readonly IExamAttemptAnswerRepository _examAttemptAnswerRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ExamAttemptAnswerService(IExamAttemptAnswerRepository examAttemptAnswerRepository, IUnitOfWork unitOfWork)
    {
        _examAttemptAnswerRepository = examAttemptAnswerRepository;
        _unitOfWork = unitOfWork;
    }
}
