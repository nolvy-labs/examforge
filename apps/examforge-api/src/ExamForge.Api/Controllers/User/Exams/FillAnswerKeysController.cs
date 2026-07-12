using ExamForge.Application.Exams;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.User.Exams;

public sealed class FillAnswerKeysController : UserBaseController
{
    private readonly FillAnswerKeyService _fillAnswerKeyService;

    public FillAnswerKeysController(FillAnswerKeyService fillAnswerKeyService)
    {
        _fillAnswerKeyService = fillAnswerKeyService;
    }
}