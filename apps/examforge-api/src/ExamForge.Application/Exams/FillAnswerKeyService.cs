using ExamForge.Application.Abstractions.Exams;
using ExamForge.Application.Abstractions.Persistence;

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