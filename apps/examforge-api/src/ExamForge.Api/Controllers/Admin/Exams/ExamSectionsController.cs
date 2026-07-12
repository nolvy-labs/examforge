using ExamForge.Application.Exams;

namespace ExamForge.Api.Controllers.Admin.Exams;

public sealed class ExamSectionsController : AdminBaseController
{
    private readonly ExamSectionService _examSectionService;

    public ExamSectionsController(ExamSectionService examSectionService)
    {
        _examSectionService = examSectionService;
    }
}