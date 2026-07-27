using ExamForge.Api.Common;
using ExamForge.Api.Common.Constants;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Common;
using ExamForge.Application.Student.ExamAttempts.Dtos;
using ExamForge.Application.Student.ExamAttempts.Errors;
using ExamForge.Application.Student.ExamAttempts.Services;
using ExamForge.Domain.Users;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.JsonPatch.SystemTextJson;
using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Student.ExamAttempts;

public sealed class ExamAttemptsController : StudentBaseController
{
    private readonly ExamAttemptService _service;

    public ExamAttemptsController(ExamAttemptService service)
    {
        _service = service;
    }

    [HttpPost($"~/{ApiRoutes.V1}/exams/{{examId:guid}}/attempts")]
    public async Task<ActionResult<ExamAttemptDetailResponse>> Create(
        Guid examId,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(examId, cancellationToken);
        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error, result.AdditionalData);
        }

        SetEtag(result.Value!.Revision);
        return CreatedAtAction(
            nameof(GetDetail),
            new { attemptId = result.Value.AttemptId },
            result.Value);
    }

    [HttpGet($"~/{ApiRoutes.V1}/exam-attempts/{{attemptId:guid}}")]
    public async Task<ActionResult<ExamAttemptDetailResponse>> GetDetail(
        Guid attemptId,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetDetailAsync(attemptId, cancellationToken);
        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error, result.AdditionalData);
        }

        SetEtag(result.Value!.Revision);
        return Ok(result.Value);
    }

    [HttpGet($"~/{ApiRoutes.V1}/exam-attempts")]
    public async Task<ActionResult<CollectionResponse<ExamAttemptListItemResponse>>> GetPage(
        [FromQuery] GetExamAttemptsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetPageAsync(request, cancellationToken);
        return result.IsSuccess
            ? Ok(result.Value)
            : ToActionResult(result.Error, result.AdditionalData);
    }

    [HttpPatch($"~/{ApiRoutes.V1}/exam-attempts/{{attemptId:guid}}")]
    [Consumes("application/json-patch+json")]
    public async Task<ActionResult<ExamAttemptDetailResponse>> Patch(
        Guid attemptId,
        [FromBody] JsonPatchDocument<ExamAttemptPatchDocumentModel> patchDocument,
        CancellationToken cancellationToken)
    {
        if (!TryGetExpectedRevision(out var expectedRevision, out var headerError))
        {
            return headerError!;
        }

        var result = await _service.PatchAsync(
            attemptId,
            expectedRevision,
            JsonPatchOperationMapper.Map(patchDocument),
            cancellationToken);
        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error, result.AdditionalData);
        }

        SetEtag(result.Value!.Revision);
        return Ok(result.Value);
    }

    [HttpPost($"~/{ApiRoutes.V1}/exam-attempts/{{attemptId:guid}}/submit")]
    public async Task<ActionResult<ExamAttemptDetailResponse>> Submit(
        Guid attemptId,
        CancellationToken cancellationToken)
    {
        if (!TryGetExpectedRevision(out var expectedRevision, out var headerError))
        {
            return headerError!;
        }

        var result = await _service.SubmitAsync(
            attemptId,
            expectedRevision,
            cancellationToken);
        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error, result.AdditionalData);
        }

        SetEtag(result.Value!.Revision);
        return Ok(result.Value);
    }

    [HttpPost($"~/{ApiRoutes.V1}/exam-attempts/{{attemptId:guid}}/abandon")]
    public async Task<ActionResult<ExamAttemptDetailResponse>> Abandon(
        Guid attemptId,
        CancellationToken cancellationToken)
    {
        if (!TryGetExpectedRevision(out var expectedRevision, out var headerError))
        {
            return headerError!;
        }

        var result = await _service.AbandonAsync(
            attemptId,
            expectedRevision,
            cancellationToken);
        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error, result.AdditionalData);
        }

        SetEtag(result.Value!.Revision);
        return Ok(result.Value);
    }

    private bool TryGetExpectedRevision(
        out long expectedRevision,
        out ActionResult? errorResult)
    {
        expectedRevision = default;
        errorResult = null;
        if (!Request.Headers.TryGetValue("If-Match", out var values) ||
            values.Count == 0)
        {
            errorResult = StatusCode(
                StatusCodes.Status428PreconditionRequired,
                CreateProblem(
                    StatusCodes.Status428PreconditionRequired,
                    "Precondition Required",
                    "If-Match is required."));
            return false;
        }

        if (values.Count != 1 ||
            !ContentRevisionEtags.TryParse(values[0], out expectedRevision))
        {
            errorResult = BadRequest(CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "If-Match must contain one quoted positive revision."));
            return false;
        }

        return true;
    }

    private ActionResult ToActionResult(
        ExamAttemptError error,
        object? additionalData = null)
    {
        var problem = error switch
        {
            ExamAttemptError.CurrentUserUnavailable => CreateProblem(
                StatusCodes.Status401Unauthorized,
                "Unauthorized",
                "The authenticated student identifier is unavailable."),
            ExamAttemptError.ExamNotFound => CreateProblem(
                StatusCodes.Status404NotFound,
                "Not Found",
                "Exam was not found."),
            ExamAttemptError.AttemptNotFound => CreateProblem(
                StatusCodes.Status404NotFound,
                "Not Found",
                "Exam attempt was not found."),
            ExamAttemptError.PublishedVersionNotFound => CreateProblem(
                StatusCodes.Status409Conflict,
                "Conflict",
                "The exam has no published version."),
            ExamAttemptError.ActiveAttemptExists => CreateProblem(
                StatusCodes.Status409Conflict,
                "Conflict",
                "An in-progress attempt already exists."),
            ExamAttemptError.AttemptAlreadySubmitted => CreateProblem(
                StatusCodes.Status409Conflict,
                "Conflict",
                "The attempt has already been submitted."),
            ExamAttemptError.AttemptAlreadyAbandoned => CreateProblem(
                StatusCodes.Status409Conflict,
                "Conflict",
                "The attempt has already been abandoned."),
            ExamAttemptError.InvalidAttemptState => CreateProblem(
                StatusCodes.Status409Conflict,
                "Conflict",
                "The attempt is not in a valid state for this operation."),
            ExamAttemptError.RevisionMismatch or
            ExamAttemptError.ConcurrencyConflict => CreateProblem(
                StatusCodes.Status409Conflict,
                "Conflict",
                "The attempt revision is stale."),
            ExamAttemptError.InvalidPatch => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "The JSON Patch document is invalid."),
            ExamAttemptError.InvalidScoringConfiguration => CreateProblem(
                StatusCodes.Status409Conflict,
                "Conflict",
                "The frozen exam version has an invalid scoring configuration."),
            ExamAttemptError.InvalidState => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "State must be 'in-progress' or 'completed'."),
            ExamAttemptError.InvalidPagination => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "Page must be at least 1 and pageSize must be between 1 and 100."),
            _ => CreateProblem(
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "The exam-attempt request is invalid.")
        };

        problem.Extensions["code"] = ErrorCode(error);
        if (additionalData is ActiveAttemptConflict active)
        {
            problem.Extensions["existingAttemptId"] = active.ExistingAttemptId;
        }

        if (additionalData is AttemptRevisionConflict revision)
        {
            problem.Extensions["currentRevision"] = revision.CurrentRevision;
        }

        if (additionalData is IReadOnlyList<PatchValidationError> patchErrors)
        {
            problem.Extensions["errors"] = patchErrors;
        }

        return StatusCode(problem.Status!.Value, problem);
    }

    private static string ErrorCode(ExamAttemptError error) =>
        error switch
        {
            ExamAttemptError.CurrentUserUnavailable => "current_user_unavailable",
            ExamAttemptError.ExamNotFound => "exam_not_found",
            ExamAttemptError.PublishedVersionNotFound => "published_version_not_found",
            ExamAttemptError.AttemptNotFound => "attempt_not_found",
            ExamAttemptError.ActiveAttemptExists => "active_attempt_exists",
            ExamAttemptError.InvalidAttemptState => "invalid_attempt_state",
            ExamAttemptError.RevisionMismatch => "revision_mismatch",
            ExamAttemptError.ConcurrencyConflict => "concurrency_conflict",
            ExamAttemptError.AttemptAlreadySubmitted => "attempt_already_submitted",
            ExamAttemptError.AttemptAlreadyAbandoned => "attempt_already_abandoned",
            ExamAttemptError.InvalidPatch => "invalid_patch",
            ExamAttemptError.InvalidScoringConfiguration => "invalid_scoring_configuration",
            ExamAttemptError.InvalidState => "invalid_state",
            ExamAttemptError.InvalidPagination => "invalid_pagination",
            _ => error.ToString().ToLowerInvariant()
        };

    private void SetEtag(long revision)
    {
        Response.Headers.ETag = ContentRevisionEtags.Format(revision);
    }

    private ProblemDetails CreateProblem(int status, string title, string detail) =>
        new()
        {
            Status = status,
            Title = title,
            Detail = detail,
            Instance = HttpContext.Request.Path
        };
}
