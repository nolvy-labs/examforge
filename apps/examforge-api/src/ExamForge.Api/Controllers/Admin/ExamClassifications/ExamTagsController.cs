using ExamForge.Application.Admin.ExamClassifications.Dtos;
using ExamForge.Application.Admin.ExamClassifications.Errors;
using ExamForge.Application.Admin.ExamClassifications.Services;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Domain.Users;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Admin.ExamClassifications;

[ApiController]
[Authorize(Roles = nameof(UserRole.Admin))]
public sealed class ExamTagsController : AdminBaseController
{
    private readonly AdminExamTagService _examTagService;

    public ExamTagsController(AdminExamTagService examTagService)
    {
        _examTagService = examTagService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ExamTagResponse>>> List(
        [FromQuery] ExamTagType? type,
        [FromQuery] bool includeArchived = true,
        CancellationToken cancellationToken = default)
    {
        var tags = await _examTagService.ListAsync(
            type,
            includeArchived,
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
            cancellationToken);

        if (!result.IsSuccess)
        {
            return ToProblem(result.Error);
        }

        return Ok(result.Value);
    }

    [HttpPost]
    public async Task<ActionResult<ExamTagResponse>> Create(
        CreateExamTagRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _examTagService.CreateAsync(request, cancellationToken);

        if (!result.IsSuccess)
        {
            return ToProblem(result.Error);
        }

        var response = result.Value!;

        return CreatedAtAction(
            nameof(GetById),
            "ExamTags",
            new { id = response.Id },
            response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ExamTagResponse>> Update(
        Guid id,
        UpdateExamTagRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _examTagService.UpdateAsync(id, request, cancellationToken);

        if (!result.IsSuccess)
        {
            return ToProblem(result.Error);
        }

        return Ok(result.Value);
    }

    [HttpPost("{id:guid}/archive")]
    public async Task<IActionResult> Archive(
        Guid id,
        CancellationToken cancellationToken)
    {
        var error = await _examTagService.ArchiveAsync(id, cancellationToken);

        if (error != ExamTagError.None)
        {
            return ToProblem(error);
        }

        return NoContent();
    }

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> Restore(
        Guid id,
        CancellationToken cancellationToken)
    {
        var error = await _examTagService.RestoreAsync(id, cancellationToken);

        if (error != ExamTagError.None)
        {
            return ToProblem(error);
        }

        return NoContent();
    }

    private ActionResult ToProblem(ExamTagError error)
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

            ExamTagError.SlugAlreadyExists => Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Conflict",
                Detail = "Exam tag slug already exists for this tag type.",
                Instance = HttpContext.Request.Path
            }),

            ExamTagError.InvalidName => BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Bad Request",
                Detail = "Exam tag name is invalid.",
                Instance = HttpContext.Request.Path
            }),

            ExamTagError.InvalidSlug => BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Bad Request",
                Detail = "Exam tag slug is invalid.",
                Instance = HttpContext.Request.Path
            }),

            ExamTagError.InvalidDescription => BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Bad Request",
                Detail = "Exam tag description is too long.",
                Instance = HttpContext.Request.Path
            }),

            ExamTagError.InvalidType => BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Bad Request",
                Detail = "Exam tag type is invalid.",
                Instance = HttpContext.Request.Path
            }),

            _ => BadRequest()
        };
    }
}