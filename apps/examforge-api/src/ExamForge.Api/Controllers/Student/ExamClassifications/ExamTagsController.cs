using ExamForge.Application.Student.ExamClassifications.Dtos;
using ExamForge.Application.Student.ExamClassifications.Errors;
using ExamForge.Application.Student.ExamClassifications.Services;
using ExamForge.Domain.ExamClassifications;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Student.ExamClassifications;

public sealed class ExamTagsController : StudentBaseController
{
    private readonly StudentExamTagService _examTagService;

    public ExamTagsController(StudentExamTagService examTagService)
    {
        _examTagService = examTagService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StudentExamTagResponse>>> List(
        [FromQuery] ExamTagType? type,
        CancellationToken cancellationToken)
    {
        var tags = await _examTagService.ListActiveAsync(
            type,
            cancellationToken);

        return Ok(tags);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<StudentExamTagResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _examTagService.GetActiveByIdAsync(
            id,
            cancellationToken);

        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error);
        }

        return Ok(result.Value);
    }

    [HttpGet("{type}/{slug}")]
    public async Task<ActionResult<StudentExamTagResponse>> GetBySlug(
        ExamTagType type,
        string slug,
        CancellationToken cancellationToken)
    {
        var result = await _examTagService.GetActiveByTypeAndSlugAsync(
            type,
            slug,
            cancellationToken);

        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error);
        }

        return Ok(result.Value);
    }

    private ActionResult ToActionResult(StudentExamTagError error)
    {
        return error switch
        {
            StudentExamTagError.NotFound => NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Not Found",
                Detail = "Exam tag was not found.",
                Instance = HttpContext.Request.Path
            }),

            StudentExamTagError.InvalidType => BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Bad Request",
                Detail = "Exam tag type is invalid.",
                Instance = HttpContext.Request.Path
            }),

            StudentExamTagError.InvalidSlug => BadRequest(new ProblemDetails
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