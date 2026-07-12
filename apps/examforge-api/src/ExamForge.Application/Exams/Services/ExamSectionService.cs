using ExamForge.Application.Abstractions;

namespace ExamForge.Application.Exams;

public sealed class ExamSectionService
{
    private readonly IExamSectionRepository _examSectionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ExamSectionService(IExamSectionRepository examSectionRepository, IUnitOfWork unitOfWork)
    {
        _examSectionRepository = examSectionRepository;
        _unitOfWork = unitOfWork;
    }
}
