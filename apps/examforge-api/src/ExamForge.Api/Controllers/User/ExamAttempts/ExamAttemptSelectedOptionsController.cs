using ExamForge.Application.ExamAttempts;

namespace ExamForge.Api.Controllers.User.ExamAttempts;

public sealed class ExamAttemptSelectedOptionsController : UserBaseController
{
    private readonly ExamAttemptSelectedOptionService _examAttemptSelectedOptionService;

    public ExamAttemptSelectedOptionsController(ExamAttemptSelectedOptionService examAttemptSelectedOptionService)
    {
        _examAttemptSelectedOptionService = examAttemptSelectedOptionService;
    }
}
