using ExamForge.Application.ExamAttempts;


namespace ExamForge.Api.Controllers.Admin.ExamAttempts;

public sealed class ExamAttemptsController : AdminBaseController
{
    private readonly ExamAttemptService _examAttemptService;

    public ExamAttemptsController(ExamAttemptService examAttemptService)
    {
        _examAttemptService = examAttemptService;
    }
}
