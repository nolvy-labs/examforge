using ExamForge.Api.Common.Constants;
using ExamForge.Application.ExamClassifications;
using ExamForge.Domain.Users;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers;

[ApiController]
[Authorize(Roles = nameof(UserRole.Admin))]
[Route(ApiRoutes.AdminExamCategories)]
public sealed class AdminExamCategoriesController : ControllerBase
{
    private readonly ExamCategoryService _examCategoryService;

    public AdminExamCategoriesController(ExamCategoryService examCategoryService)
    {
        _examCategoryService = examCategoryService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<ExamCategoryResponse>>> GetList(
        [FromQuery] bool? isArchived,
        CancellationToken cancellationToken)
    {
        var categories = await _examCategoryService.GetAdminListAsync(
            isArchived,
            cancellationToken);

        return Ok(categories);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ExamCategoryResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _examCategoryService.GetByIdAsync(id, cancellationToken);

        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error, result.AdditionalData);
        }

        return Ok(result.Value);
    }

    [HttpPost]
    public async Task<ActionResult<ExamCategoryResponse>> Create(
        CreateExamCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _examCategoryService.CreateAsync(request, cancellationToken);

        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error, result.AdditionalData);
        }

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.Value!.Id },
            result.Value);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ExamCategoryResponse>> Update(
        Guid id,
        UpdateExamCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _examCategoryService.UpdateAsync(
            id,
            request,
            cancellationToken);

        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error, result.AdditionalData);
        }

        return Ok(result.Value);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Archive(
        Guid id,
        CancellationToken cancellationToken)
    {
        var error = await _examCategoryService.ArchiveAsync(id, cancellationToken);

        if (error != ExamCategoryError.None)
        {
            return ToActionResult(error);
        }

        return NoContent();
    }

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> Restore(
        Guid id,
        CancellationToken cancellationToken)
    {
        var error = await _examCategoryService.RestoreAsync(id, cancellationToken);

        if (error != ExamCategoryError.None)
        {
            return ToActionResult(error);
        }

        return NoContent();
    }

    private ActionResult ToActionResult(
        ExamCategoryError error,
        object? additionalData = null)
    {
        var problem = error switch
        {
            ExamCategoryError.NotFound => CreateProblem(
                StatusCodes.Status404NotFound,
                "Not Found",
                "Exam category was not found."),

            ExamCategoryError.SlugAlreadyExists => CreateProblem(
                StatusCodes.Status409Conflict,
                "Conflict",
                "An exam category with this slug already exists."),

            ExamCategoryError.InvalidName => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "Exam category name is invalid."),

            ExamCategoryError.InvalidSlug => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "Exam category slug is invalid."),

            ExamCategoryError.InvalidDescription => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "Exam category description is invalid."),

            ExamCategoryError.InvalidMatchMode => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "Exam category match mode is invalid."),

            ExamCategoryError.DuplicateTagIds => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "Exam category tag IDs must be unique."),

            ExamCategoryError.MissingOrArchivedTagIds => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "One or more exam tag IDs do not exist or are archived."),

            _ => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "The exam category request is invalid.")
        };

        if (error == ExamCategoryError.MissingOrArchivedTagIds &&
            additionalData is IReadOnlyCollection<Guid> tagIds)
        {
            problem.Extensions["missingOrArchivedTagIds"] = tagIds;
        }

        return StatusCode(problem.Status!.Value, problem);
    }

    private ProblemDetails CreateProblem(int status, string title, string detail)
    {
        return new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Instance = HttpContext.Request.Path
        };
    }
}