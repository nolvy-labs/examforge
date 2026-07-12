using ExamForge.Application.Exams;

namespace ExamForge.Api.Controllers.Admin.Exams;

public sealed class QuestionOptionsController : AdminBaseController
{
    private readonly QuestionOptionService _questionOptionService;

    public QuestionOptionsController(QuestionOptionService questionOptionService)
    {
        _questionOptionService = questionOptionService;
    }
}