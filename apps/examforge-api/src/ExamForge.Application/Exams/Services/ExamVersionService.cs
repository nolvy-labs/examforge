using ExamForge.Application.Abstractions;

namespace ExamForge.Application.Exams;

public sealed class ExamVersionService
{
    private readonly IExamVersionRepository _examVersionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ExamVersionService(IExamVersionRepository examVersionRepository, IUnitOfWork unitOfWork)
    {
        _examVersionRepository = examVersionRepository;
        _unitOfWork = unitOfWork;
    }
}
