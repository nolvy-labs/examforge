using ExamForge.Application.Abstractions;

namespace ExamForge.Application.ExamAttempts;

public sealed class ExamAttemptSelectedOptionService
{
    private readonly IExamAttemptSelectedOptionRepository _examAttemptSelectedOptionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ExamAttemptSelectedOptionService(IExamAttemptSelectedOptionRepository examAttemptSelectedOptionRepository, IUnitOfWork unitOfWork)
    {
        _examAttemptSelectedOptionRepository = examAttemptSelectedOptionRepository;
        _unitOfWork = unitOfWork;
    }
}
