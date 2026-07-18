using ExamForge.Application.Student.ExamClassifications.Dtos;
using ExamForge.Application.Student.ExamClassifications.Services;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Student.ExamClassifications;

public sealed class ExamCategoriesController : StudentBaseController
{
    private readonly StudentExamCategoryService _examCategoryService;

    public ExamCategoriesController(StudentExamCategoryService examCategoryService)
    {
        _examCategoryService = examCategoryService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<StudentExamCategoryResponse>>> GetList(
        CancellationToken cancellationToken)
    {
        var categories = await _examCategoryService.ListActiveAsync(cancellationToken);

        return Ok(categories);
    }

    [HttpGet("{idOrSlug}")]
    public async Task<ActionResult<StudentExamCategoryResponse>> GetByIdOrSlug(
        string idOrSlug,
        CancellationToken cancellationToken)
    {
        var category = await _examCategoryService.GetActiveByIdOrSlugAsync(
            idOrSlug,
            cancellationToken);

        if (category is null)
        {
            return NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Not Found",
                Detail = "Exam category was not found.",
                Instance = HttpContext.Request.Path
            });
        }

        return Ok(category);
    }
}