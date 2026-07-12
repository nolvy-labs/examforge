using ExamForge.Application.Exams;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.User.Exams;

public sealed class ExamSectionsController : UserBaseController
{
    private readonly ExamSectionService _examSectionService;

    public ExamSectionsController(ExamSectionService examSectionService)
    {
        _examSectionService = examSectionService;
    }
}