using ExamForge.Application.Exams;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.User.Exams;

public sealed class QuestionOptionsController : UserBaseController
{
    private readonly QuestionOptionService _questionOptionService;

    public QuestionOptionsController(QuestionOptionService questionOptionService)
    {
        _questionOptionService = questionOptionService;
    }
}