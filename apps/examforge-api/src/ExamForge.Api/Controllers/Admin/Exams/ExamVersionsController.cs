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
    private readonly AdminExamVersionContentBatchService _batchService;

    public ExamVersionsController(
        AdminExamVersionService examVersionService,
        AdminExamVersionContentBatchService batchService)
    {
        _examVersionService = examVersionService;
        _batchService = batchService;
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
        if (!result.IsSuccess)
            return ToActionResult(result.Error);
        SetEtag(result.Value!.ContentRevision);
        return Ok(result.Value);
    }

    [HttpGet("{versionId:guid}")]
    public async Task<ActionResult<ExamVersionDetailResponse>> GetById(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken)
    {
        var result = await _examVersionService.GetByIdAsync(examId, versionId, cancellationToken);
        if (!result.IsSuccess)
            return ToActionResult(result.Error);
        SetEtag(result.Value!.ContentRevision);
        return Ok(result.Value);
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

        SetEtag(result.Value!.ContentRevision);

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
        if (!result.IsSuccess)
            return ToActionResult(result.Error, result.AdditionalData);
        SetEtag(result.Value!.ContentRevision);
        return Ok(result.Value);
    }

    [HttpPost("{versionId:guid}/content/batch")]
    [Consumes("application/json")]
    public async Task<ActionResult<BulkUpdateExamVersionContentResponse>> BatchUpdateContent(
        Guid examId,
        Guid versionId,
        [FromBody] BulkUpdateExamVersionContentRequest request,
        CancellationToken cancellationToken)
    {
        if (!Request.Headers.TryGetValue("If-Match", out var values) || values.Count == 0)
        {
            return StatusCode(StatusCodes.Status428PreconditionRequired, CreateProblem(
                StatusCodes.Status428PreconditionRequired,
                "Precondition Required",
                "If-Match is required."));
        }

        if (values.Count != 1 || !ContentRevisionEtags.TryParse(values[0], out var expectedRevision))
        {
            return BadRequest(CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "If-Match must contain one quoted positive content revision."));
        }

        var result = await _batchService.UpdateAsync(
            examId, versionId, expectedRevision, request, cancellationToken);
        if (!result.IsSuccess)
            return ToBatchActionResult(result.Error, result.AdditionalData);

        SetEtag(result.Value!.ContentRevision);
        return Ok(result.Value);
    }

    [HttpPost("{versionId:guid}/publish")]
    public async Task<ActionResult<ExamVersionDetailResponse>> Publish(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken)
    {
        var result = await _examVersionService.PublishAsync(examId, versionId, cancellationToken);
        if (!result.IsSuccess)
            return ToActionResult(result.Error);
        SetEtag(result.Value!.ContentRevision);
        return Ok(result.Value);
    }

    [HttpPost("{versionId:guid}/retire")]
    public async Task<ActionResult<ExamVersionDetailResponse>> Retire(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken)
    {
        var result = await _examVersionService.RetireAsync(examId, versionId, cancellationToken);
        if (!result.IsSuccess)
            return ToActionResult(result.Error);
        SetEtag(result.Value!.ContentRevision);
        return Ok(result.Value);
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

    private ActionResult ToBatchActionResult(
        BulkUpdateExamVersionContentError error,
        object? additionalData)
    {
        var problem = error switch
        {
            BulkUpdateExamVersionContentError.ExamNotFound => CreateProblem(
                StatusCodes.Status404NotFound, "Not Found", "Exam was not found."),
            BulkUpdateExamVersionContentError.VersionNotFound or
            BulkUpdateExamVersionContentError.TargetNotFound => CreateProblem(
                StatusCodes.Status404NotFound, "Not Found", "Version content was not found."),
            BulkUpdateExamVersionContentError.ExamArchived => CreateProblem(
                StatusCodes.Status409Conflict, "Conflict", "Archived exams cannot be modified."),
            BulkUpdateExamVersionContentError.VersionNotEditable => CreateProblem(
                StatusCodes.Status409Conflict, "Conflict", "Only Draft versions can be edited."),
            BulkUpdateExamVersionContentError.PreconditionFailed => CreateProblem(
                StatusCodes.Status412PreconditionFailed, "Precondition Failed", "The content revision is stale."),
            BulkUpdateExamVersionContentError.ConcurrencyConflict => CreateProblem(
                StatusCodes.Status409Conflict, "Conflict", "Version content changed concurrently."),
            BulkUpdateExamVersionContentError.ContentRevisionExhausted => CreateProblem(
                StatusCodes.Status409Conflict, "Conflict", "The content revision is exhausted."),
            _ => CreateProblem(StatusCodes.Status400BadRequest, "Bad Request", "The batch update is invalid.")
        };
        if (additionalData is IReadOnlyList<BulkContentValidationError> errors)
            problem.Extensions["errors"] = errors;
        return StatusCode(problem.Status!.Value, problem);
    }

    private void SetEtag(long revision)
    {
        Response.Headers.ETag = ContentRevisionEtags.Format(revision);
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