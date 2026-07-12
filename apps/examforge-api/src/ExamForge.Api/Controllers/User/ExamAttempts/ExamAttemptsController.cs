using ExamForge.Application.ExamAttempts;


namespace ExamForge.Api.Controllers.User.ExamAttempts;

public sealed class ExamAttemptsController : UserBaseController
{
    private readonly ExamAttemptService _examAttemptService;

    public ExamAttemptsController(ExamAttemptService examAttemptService)
    {
        _examAttemptService = examAttemptService;
    }
}
