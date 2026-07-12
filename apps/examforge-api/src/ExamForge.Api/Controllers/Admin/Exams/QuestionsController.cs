using ExamForge.Application.Exams;

namespace ExamForge.Api.Controllers.Admin.Exams;

public sealed class QuestionsController : AdminBaseController
{
    private readonly QuestionService _questionService;

    public QuestionsController(QuestionService questionService)
    {
        _questionService = questionService;
    }
}