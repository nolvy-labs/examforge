using ExamForge.Application.Exams;

namespace ExamForge.Api.Controllers.Admin.Exams;

public sealed class ExamVersionsController : AdminBaseController
{
    private readonly ExamVersionService _examVersionService;

    public ExamVersionsController(ExamVersionService examVersionService)
    {
        _examVersionService = examVersionService;
    }
}