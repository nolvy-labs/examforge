using ExamForge.Application.Exams;

namespace ExamForge.Api.Controllers.Admin.Exams;

public sealed class ExamsController : AdminBaseController
{
    private readonly ExamService _examService;

    public ExamsController(ExamService examService)
    {
        _examService = examService;
    }
}