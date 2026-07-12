using ExamForge.Application.Exams;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.User.Exams;

public sealed class QuestionsController : UserBaseController
{
    private readonly QuestionService _questionService;

    public QuestionsController(QuestionService questionService)
    {
        _questionService = questionService;
    }
}