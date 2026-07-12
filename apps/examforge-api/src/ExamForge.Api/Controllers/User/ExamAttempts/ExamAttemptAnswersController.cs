using ExamForge.Application.ExamAttempts;

namespace ExamForge.Api.Controllers.User.ExamAttempts;

public sealed class ExamAttemptAnswersController : UserBaseController
{
    private readonly ExamAttemptAnswerService _examAttemptAnswerService;

    public ExamAttemptAnswersController(ExamAttemptAnswerService examAttemptAnswerService)
    {
        _examAttemptAnswerService = examAttemptAnswerService;
    }
}