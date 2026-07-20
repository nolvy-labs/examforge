using ExamForge.Api.Common;
using ExamForge.Api.Common.Constants;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Services;
using ExamForge.Application.Common;

using Microsoft.AspNetCore.JsonPatch.SystemTextJson;
using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Admin.Exams;

[Route($"~/{ApiRoutes.V1}/admin/exams/{{examId:guid}}/versions")]
public sealed class ExamVersionsController : AdminBaseController
{
    private readonly AdminExamVersionService _examVersionService;

    public ExamVersionsController(AdminExamVersionService examVersionService)
    {
        _examVersionService = examVersionService;
    }

    [HttpGet]
    public async Task<ActionResult<CollectionResponse<ExamVersionSummaryResponse>>> GetPage(
        Guid examId,
        [FromQuery] GetExamVersionsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _examVersionService.GetPageAsync(examId, request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpGet("published")]
    public async Task<ActionResult<ExamVersionDetailResponse>> GetPublished(
        Guid examId,
        CancellationToken cancellationToken)
    {
        var result = await _examVersionService.GetCurrentPublishedAsync(examId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpGet("{versionId:guid}")]
    public async Task<ActionResult<ExamVersionDetailResponse>> GetById(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken)
    {
        var result = await _examVersionService.GetByIdAsync(examId, versionId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpPost]
    public async Task<ActionResult<ExamVersionDetailResponse>> Create(
        Guid examId,
        [FromBody] CreateExamVersionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _examVersionService.CreateAsync(examId, request, cancellationToken);

        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error, result.AdditionalData);
        }

        return CreatedAtAction(
            nameof(GetById),
            new { examId, versionId = result.Value!.Id },
            result.Value);
    }

    [HttpPatch("{versionId:guid}")]
    [Consumes("application/json-patch+json")]
    public async Task<ActionResult<ExamVersionDetailResponse>> Update(
        Guid examId,
        Guid versionId,
        [FromBody] JsonPatchDocument<ExamVersionPatchModel>? patchDocument,
        CancellationToken cancellationToken)
    {
        var result = await _examVersionService.UpdateAsync(
            examId,
            versionId,
            JsonPatchOperationMapper.Map(patchDocument),
            cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error, result.AdditionalData);
    }

    [HttpPost("{versionId:guid}/publish")]
    public async Task<ActionResult<ExamVersionDetailResponse>> Publish(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken)
    {
        var result = await _examVersionService.PublishAsync(examId, versionId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpPost("{versionId:guid}/retire")]
    public async Task<ActionResult<ExamVersionDetailResponse>> Retire(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken)
    {
        var result = await _examVersionService.RetireAsync(examId, versionId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpDelete("{versionId:guid}")]
    public async Task<IActionResult> Delete(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken)
    {
        var error = await _examVersionService.DeleteAsync(examId, versionId, cancellationToken);
        return error == ExamVersionError.None ? NoContent() : ToActionResult(error);
    }

    private ActionResult ToActionResult(ExamVersionError error, object? additionalData = null)
    {
        var problem = error switch
        {
            ExamVersionError.CurrentUserUnavailable => CreateProblem(
                StatusCodes.Status401Unauthorized,
                "Unauthorized",
                "The authenticated user identifier is unavailable."),
            ExamVersionError.ExamNotFound => CreateProblem(
                StatusCodes.Status404NotFound,
                "Not Found",
                "Exam was not found."),
            ExamVersionError.VersionNotFound => CreateProblem(
                StatusCodes.Status404NotFound,
                "Not Found",
                "Exam version was not found."),
            ExamVersionError.SourceVersionNotFound => CreateProblem(
                StatusCodes.Status404NotFound,
                "Not Found",
                "Source exam version was not found for this exam."),
            ExamVersionError.PublishedVersionNotFound => CreateProblem(
                StatusCodes.Status404NotFound,
                "Not Found",
                "This exam has no published version."),
            ExamVersionError.ExamArchived => CreateConflict("Archived exams cannot be modified."),
            ExamVersionError.VersionNotEditable => CreateConflict("Only Draft versions can be edited."),
            ExamVersionError.InvalidStatusTransition => CreateConflict("The requested status transition is not allowed."),
            ExamVersionError.VersionNotReadyForPublication => CreateConflict(
                "Every section and question must be complete and TotalScore must match before publication."),
            ExamVersionError.VersionCannotBeDeleted => CreateConflict("Only Draft versions can be deleted."),
            ExamVersionError.VersionNumberExhausted => CreateConflict("The exam version-number sequence is exhausted."),
            ExamVersionError.ConcurrencyConflict => CreateConflict(
                "The exam version changed concurrently. Retry the request."),
            ExamVersionError.InvalidPagination => CreateBadRequest("Pagination or sorting values are invalid."),
            ExamVersionError.InvalidTitle => CreateBadRequest("Exam version title is invalid."),
            ExamVersionError.InvalidDescription => CreateBadRequest("Exam version description is invalid."),
            ExamVersionError.InvalidInstructions => CreateBadRequest("Exam version instructions are invalid."),
            ExamVersionError.InvalidDuration => CreateBadRequest(
                $"Duration must be between 1 and {ExamForge.Domain.Exams.ExamVersionConstraints.MaxDurationMinutes} minutes."),
            ExamVersionError.InvalidStatus => CreateBadRequest("Exam version status is invalid."),
            ExamVersionError.InvalidNestedContent => CreateBadRequest("Nested exam content is invalid."),
            ExamVersionError.InvalidPatch => CreateBadRequest("The JSON Patch document is invalid."),
            _ => CreateBadRequest("The exam version request is invalid.")
        };

        if (additionalData is IReadOnlyList<ExamForge.Application.Admin.Exams.Models.NestedContentValidationError> errors)
            problem.Extensions["errors"] = errors;
        if (additionalData is IReadOnlyList<PatchValidationError> patchErrors)
            problem.Extensions["errors"] = patchErrors;
        return StatusCode(problem.Status!.Value, problem);
    }

    private ProblemDetails CreateBadRequest(string detail)
    {
        return CreateProblem(StatusCodes.Status400BadRequest, "Bad Request", detail);
    }

    private ProblemDetails CreateConflict(string detail)
    {
        return CreateProblem(StatusCodes.Status409Conflict, "Conflict", detail);
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