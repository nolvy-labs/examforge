using ExamForge.Api.Controllers.Admin;
using ExamForge.Application.ExamClassifications;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.User;

public sealed class ExamCategoriesController : UserBaseController
{
    private readonly ExamCategoryService _examCategoryService;

    public ExamCategoriesController(ExamCategoryService examCategoryService)
    {
        _examCategoryService = examCategoryService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<ExamCategoryResponse>>> GetList(
        CancellationToken cancellationToken)
    {
        var categories = await _examCategoryService.GetPublicListAsync(cancellationToken);

        return Ok(categories);
    }

    [HttpGet("{idOrSlug}")]
    public async Task<ActionResult<ExamCategoryResponse>> GetByIdOrSlug(
        string idOrSlug,
        CancellationToken cancellationToken)
    {
        var category = await _examCategoryService.GetPublicByIdOrSlugAsync(
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