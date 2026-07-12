using ExamForge.Application.Exams;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.User.Exams;

public sealed class ExamVersionsController : UserBaseController
{
    private readonly ExamVersionService _examVersionService;

    public ExamVersionsController(ExamVersionService examVersionService)
    {
        _examVersionService = examVersionService;
    }
}