using ExamForge.Application.ExamAttempts;

namespace ExamForge.Api.Controllers.Admin.ExamAttempts;

public sealed class ExamAttemptAnswersController : AdminBaseController
{
    private readonly ExamAttemptAnswerService _examAttemptAnswerService;

    public ExamAttemptAnswersController(ExamAttemptAnswerService examAttemptAnswerService)
    {
        _examAttemptAnswerService = examAttemptAnswerService;
    }
}