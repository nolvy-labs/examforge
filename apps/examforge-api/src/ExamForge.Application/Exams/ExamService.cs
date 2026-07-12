using ExamForge.Application.Abstractions.Exams;
using ExamForge.Application.Abstractions.Persistence;

namespace ExamForge.Application.Exams;

public sealed class ExamService
{
    private readonly IExamRepository _examRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ExamService(IExamRepository examRepository, IUnitOfWork unitOfWork)
    {
        _examRepository = examRepository;
        _unitOfWork = unitOfWork;
    }
}
