using ExamForge.Application.Abstractions;

namespace ExamForge.Application.Exams;

public sealed class FillAnswerKeyService
{
    private readonly IFillAnswerKeyRepository _fillAnswerKeyRepository;
    private readonly IUnitOfWork _unitOfWork;

    public FillAnswerKeyService(IFillAnswerKeyRepository fillAnswerKeyRepository, IUnitOfWork unitOfWork)
    {
        _fillAnswerKeyRepository = fillAnswerKeyRepository;
        _unitOfWork = unitOfWork;
    }
}