using ExamForge.Application.ExamAttempts;

namespace ExamForge.Api.Controllers.Admin.ExamAttempts;

public sealed class ExamAttemptSelectedOptionsController : AdminBaseController
{
    private readonly ExamAttemptSelectedOptionService _examAttemptSelectedOptionService;

    public ExamAttemptSelectedOptionsController(ExamAttemptSelectedOptionService examAttemptSelectedOptionService)
    {
        _examAttemptSelectedOptionService = examAttemptSelectedOptionService;
    }
}
