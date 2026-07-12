using ExamForge.Api.Common.Constants;
using ExamForge.Api.Controllers.Admin;
using ExamForge.Application.ExamTags;
using ExamForge.Domain.ExamClassifications;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.User;

[ApiController]
[Route(ApiRoutes.ExamTags)]
public sealed class ExamTagsController : AdminBaseController
{
    private readonly ExamTagService _examTagService;

    public ExamTagsController(ExamTagService examTagService)
    {
        _examTagService = examTagService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ExamTagResponse>>> List(
        [FromQuery] ExamTagType? type,
        CancellationToken cancellationToken)
    {
        var tags = await _examTagService.ListAsync(
            type,
            includeArchived: false,
            cancellationToken);

        return Ok(tags);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ExamTagResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _examTagService.GetByIdAsync(
            id,
            includeArchived: false,
            cancellationToken);

        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error);
        }

        return Ok(result.Value);
    }

    [HttpGet("{type}/{slug}")]
    public async Task<ActionResult<ExamTagResponse>> GetBySlug(
        ExamTagType type,
        string slug,
        CancellationToken cancellationToken)
    {
        var result = await _examTagService.GetByTypeAndSlugAsync(
            type,
            slug,
            includeArchived: false,
            cancellationToken);

        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error);
        }

        return Ok(result.Value);
    }

    private ActionResult ToActionResult(ExamTagError error)
    {
        return error switch
        {
            ExamTagError.NotFound => NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Not Found",
                Detail = "Exam tag was not found.",
                Instance = HttpContext.Request.Path
            }),

            ExamTagError.InvalidType => BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Bad Request",
                Detail = "Exam tag type is invalid.",
                Instance = HttpContext.Request.Path
            }),

            ExamTagError.InvalidSlug => BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Bad Request",
                Detail = "Exam tag slug is invalid.",
                Instance = HttpContext.Request.Path
            }),

            _ => BadRequest()
        };
    }
}