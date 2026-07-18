using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Services;
using ExamForge.Application.Common;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Admin.Exams;

public sealed class ExamsController : AdminBaseController
{
    private readonly AdminExamService _examService;

    public ExamsController(AdminExamService examService)
    {
        _examService = examService;
    }

    [HttpGet]
    public async Task<ActionResult<CollectionResponse<ExamResponse>>> GetPage(
        [FromQuery] GetExamsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _examService.GetAdminPageAsync(request, cancellationToken);

        return result.IsSuccess
            ? Ok(result.Value)
            : ToActionResult(result.Error, result.AdditionalData);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ExamResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _examService.GetByIdAsync(id, cancellationToken);

        return result.IsSuccess
            ? Ok(result.Value)
            : ToActionResult(result.Error, result.AdditionalData);
    }

    [HttpPost]
    public async Task<ActionResult<ExamResponse>> Create(
        [FromBody] CreateExamRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _examService.CreateAsync(request, cancellationToken);

        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error, result.AdditionalData);
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<ExamResponse>> Update(
        Guid id,
        [FromBody] UpdateExamRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _examService.UpdateAsync(id, request, cancellationToken);

        return result.IsSuccess
            ? Ok(result.Value)
            : ToActionResult(result.Error, result.AdditionalData);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Archive(
        Guid id,
        CancellationToken cancellationToken)
    {
        var error = await _examService.ArchiveAsync(id, cancellationToken);
        return error == ExamError.None ? NoContent() : ToActionResult(error);
    }

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> Restore(
        Guid id,
        CancellationToken cancellationToken)
    {
        var error = await _examService.RestoreAsync(id, cancellationToken);
        return error == ExamError.None ? NoContent() : ToActionResult(error);
    }

    private ActionResult ToActionResult(ExamError error, object? additionalData = null)
    {
        var problem = error switch
        {
            ExamError.NotFound => CreateProblem(
                StatusCodes.Status404NotFound,
                "Not Found",
                "Exam was not found."),
            ExamError.InvalidTitle => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "Exam title is invalid."),
            ExamError.InvalidDescription => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "Exam description is invalid."),
            ExamError.InvalidType => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "Exam type is invalid."),
            ExamError.InvalidPagination => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "Exam pagination or filter values are invalid."),
            ExamError.DuplicateTagIds => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "Exam tag IDs must be unique within each collection."),
            ExamError.OverlappingTagChanges => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "An exam tag ID cannot be both added and removed."),
            ExamError.MissingOrArchivedTagIds => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "One or more exam tag IDs do not exist or are archived."),
            ExamError.TooManyTags => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                $"An exam cannot have more than {ExamForge.Domain.Exams.ExamConstraints.MaxTags} tags."),
            ExamError.UnableToGenerateUniqueSlug => CreateProblem(
                StatusCodes.Status409Conflict,
                "Conflict",
                "A unique exam slug could not be generated."),
            ExamError.CurrentUserUnavailable => CreateProblem(
                StatusCodes.Status401Unauthorized, "Unauthorized", "The authenticated user identifier is unavailable."),
            ExamError.ConcurrencyConflict => CreateProblem(
                StatusCodes.Status409Conflict, "Conflict", "The exam changed concurrently. Retry the request."),
            ExamError.InvalidNestedContent => CreateProblem(
                StatusCodes.Status400BadRequest, "Bad Request", "Nested exam content is invalid."),
            _ => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "The exam request is invalid.")
        };

        if (error == ExamError.MissingOrArchivedTagIds &&
            additionalData is IReadOnlyCollection<Guid> tagIds)
        {
            problem.Extensions["missingOrArchivedTagIds"] = tagIds;
        }

        AddNestedErrors(problem, additionalData);

        return StatusCode(problem.Status!.Value, problem);
    }

    private static void AddNestedErrors(ProblemDetails problem, object? additionalData)
    {
        if (additionalData is IReadOnlyList<ExamForge.Application.Admin.Exams.Models.NestedContentValidationError> errors)
            problem.Extensions["errors"] = errors;
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