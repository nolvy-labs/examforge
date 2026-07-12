using ExamForge.Application.Abstractions;

namespace ExamForge.Application.ExamAttempts;

public sealed class ExamAttemptService
{
    private readonly IExamAttemptRepository _examAttemptRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ExamAttemptService(IExamAttemptRepository examAttemptRepository, IUnitOfWork unitOfWork)
    {
        _examAttemptRepository = examAttemptRepository;
        _unitOfWork = unitOfWork;
    }
}
