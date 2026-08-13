using ExamForge.Api.Common;
using ExamForge.Api.Common.Constants;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Services;

using Microsoft.AspNetCore.JsonPatch.SystemTextJson;
using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Admin.Exams;

[Route($"~/{ApiRoutes.V1}/admin/exams/{{examId:guid}}/versions/{{versionId:guid}}/sections/{{sectionId:guid}}/questions/{{questionId:guid}}/answer-keys")]
public sealed class FillAnswerKeysController : AdminBaseController
{
    private readonly AdminFillAnswerKeyService _answerKeys;

    public FillAnswerKeysController(AdminFillAnswerKeyService answerKeys)
    {
        _answerKeys = answerKeys;
    }

    [HttpPost]
    public async Task<ActionResult<FillAnswerKeyResponse>> Create(
        Guid examId, Guid versionId, Guid sectionId, Guid questionId,
        [FromBody] CreateFillAnswerKeyRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _answerKeys.CreateAsync(
            examId, versionId, sectionId, questionId, request, cancellationToken);

        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error);
        }

        return StatusCode(StatusCodes.Status201Created, result.Value);
    }

    [HttpPatch("{answerKeyId:guid}")]
    [Consumes("application/json-patch+json")]
    public async Task<ActionResult<FillAnswerKeyResponse>> Update(
        Guid examId, Guid versionId, Guid sectionId, Guid questionId, Guid answerKeyId,
        [FromBody] JsonPatchDocument<FillAnswerKeyPatchModel>? patchDocument,
        CancellationToken cancellationToken)
    {
        var result = await _answerKeys.UpdateAsync(
            examId, versionId, sectionId, questionId, answerKeyId,
            JsonPatchOperationMapper.Map(patchDocument), cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error, result.AdditionalData);
    }

    [HttpDelete("{answerKeyId:guid}")]
    public async Task<IActionResult> Delete(
        Guid examId, Guid versionId, Guid sectionId, Guid questionId, Guid answerKeyId,
        CancellationToken cancellationToken)
    {
        var error = await _answerKeys.DeleteAsync(
            examId, versionId, sectionId, questionId, answerKeyId, cancellationToken);
        return error == FillAnswerKeyError.None ? NoContent() : ToActionResult(error);
    }

    private ActionResult ToActionResult(FillAnswerKeyError error, object? additionalData = null)
    {
        var problem = error switch
        {
            FillAnswerKeyError.ExamNotFound => NotFoundProblem("Exam was not found."),
            FillAnswerKeyError.VersionNotFound => NotFoundProblem("Exam version was not found for this exam."),
            FillAnswerKeyError.SectionNotFound => NotFoundProblem("Exam section was not found for this version."),
            FillAnswerKeyError.QuestionNotFound => NotFoundProblem("Question was not found for this section."),
            FillAnswerKeyError.AnswerKeyNotFound => NotFoundProblem("Fill answer key was not found."),
            FillAnswerKeyError.ExamArchived => ConflictProblem("Archived exams cannot be modified."),
            FillAnswerKeyError.VersionNotEditable => ConflictProblem("Only Draft versions can be edited."),
            FillAnswerKeyError.QuestionDoesNotSupportAnswerKeys => ConflictProblem(
                "Only FillBlank questions support answer keys."),
            FillAnswerKeyError.DuplicateAcceptedAnswer => ConflictProblem(
                "The accepted answer conflicts with an existing answer."),
            FillAnswerKeyError.ConcurrencyConflict => ConflictProblem(
                "The answer keys changed concurrently. Retry the request."),
            FillAnswerKeyError.InvalidAcceptedAnswer => BadRequestProblem("AcceptedAnswer is invalid."),
            FillAnswerKeyError.InvalidPatch => BadRequestProblem("The JSON Patch document is invalid."),
            _ => BadRequestProblem("The fill answer key request is invalid.")
        };
        if (additionalData is IReadOnlyList<PatchValidationError> errors)
            problem.Extensions["errors"] = errors;
        return StatusCode(problem.Status!.Value, problem);
    }

    private ProblemDetails BadRequestProblem(string detail) => Problem(400, "Bad Request", detail);
    private ProblemDetails NotFoundProblem(string detail) => Problem(404, "Not Found", detail);
    private ProblemDetails ConflictProblem(string detail) => Problem(409, "Conflict", detail);

    private ProblemDetails Problem(int status, string title, string detail) => new()
    {
        Status = status,
        Title = title,
        Detail = detail,
        Instance = HttpContext.Request.Path
    };
}
