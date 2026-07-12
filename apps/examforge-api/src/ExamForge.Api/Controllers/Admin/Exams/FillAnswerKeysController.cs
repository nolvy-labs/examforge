using ExamForge.Application.Exams;

namespace ExamForge.Api.Controllers.Admin.Exams;

public sealed class FillAnswerKeysController : AdminBaseController
{
    private readonly FillAnswerKeyService _fillAnswerKeyService;

    public FillAnswerKeysController(FillAnswerKeyService fillAnswerKeyService)
    {
        _fillAnswerKeyService = fillAnswerKeyService;
    }
}