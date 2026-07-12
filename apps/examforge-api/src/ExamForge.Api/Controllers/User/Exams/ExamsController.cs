using ExamForge.Application.Exams;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.User.Exams;

public sealed class ExamsController : UserBaseController
{
    private readonly ExamService _examService;

    public ExamsController(ExamService examService)
    {
        _examService = examService;
    }
}