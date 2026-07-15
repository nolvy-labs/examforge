using ExamForge.Api.Common.Constants;
using ExamForge.Application.Exams;
using ExamForge.Application.Exams.Dtos;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Admin.Exams;

[Route($"~/{ApiRoutes.V1}/admin/exams/{{examId:guid}}/versions/{{versionId:guid}}/sections/{{sectionId:guid}}/questions/{{questionId:guid}}/options")]
public sealed class QuestionOptionsController : AdminBaseController
{
    private readonly QuestionOptionService _options;

    public QuestionOptionsController(QuestionOptionService options)
    {
        _options = options;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<QuestionOptionResponse>>> GetList(
        Guid examId, Guid versionId, Guid sectionId, Guid questionId,
        CancellationToken cancellationToken)
    {
        var result = await _options.GetListAsync(
            examId, versionId, sectionId, questionId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpGet("{optionId:guid}")]
    public async Task<ActionResult<QuestionOptionResponse>> GetById(
        Guid examId, Guid versionId, Guid sectionId, Guid questionId, Guid optionId,
        CancellationToken cancellationToken)
    {
        var result = await _options.GetByIdAsync(
            examId, versionId, sectionId, questionId, optionId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpPost]
    public async Task<ActionResult<QuestionOptionResponse>> Create(
        Guid examId, Guid versionId, Guid sectionId, Guid questionId,
        [FromBody] CreateQuestionOptionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _options.CreateAsync(
            examId, versionId, sectionId, questionId, request, cancellationToken);

        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error);
        }

        return CreatedAtAction(
            nameof(GetById),
            new { examId, versionId, sectionId, questionId, optionId = result.Value!.Id },
            result.Value);
    }

    [HttpPatch("{optionId:guid}")]
    public async Task<ActionResult<QuestionOptionResponse>> Update(
        Guid examId, Guid versionId, Guid sectionId, Guid questionId, Guid optionId,
        [FromBody] UpdateQuestionOptionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _options.UpdateAsync(
            examId, versionId, sectionId, questionId, optionId, request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpPut("order")]
    public async Task<ActionResult<IReadOnlyList<QuestionOptionResponse>>> Reorder(
        Guid examId, Guid versionId, Guid sectionId, Guid questionId,
        [FromBody] ReorderQuestionOptionsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _options.ReorderAsync(
            examId, versionId, sectionId, questionId, request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpDelete("{optionId:guid}")]
    public async Task<IActionResult> Delete(
        Guid examId, Guid versionId, Guid sectionId, Guid questionId, Guid optionId,
        CancellationToken cancellationToken)
    {
        var error = await _options.DeleteAsync(
            examId, versionId, sectionId, questionId, optionId, cancellationToken);
        return error == QuestionOptionError.None ? NoContent() : ToActionResult(error);
    }

    private ActionResult ToActionResult(QuestionOptionError error)
    {
        var problem = error switch
        {
            QuestionOptionError.ExamNotFound => NotFoundProblem("Exam was not found."),
            QuestionOptionError.VersionNotFound => NotFoundProblem("Exam version was not found for this exam."),
            QuestionOptionError.SectionNotFound => NotFoundProblem("Exam section was not found for this version."),
            QuestionOptionError.QuestionNotFound => NotFoundProblem("Question was not found for this section."),
            QuestionOptionError.OptionNotFound => NotFoundProblem("Question option was not found."),
            QuestionOptionError.ExamArchived => ConflictProblem("Archived exams cannot be modified."),
            QuestionOptionError.VersionNotEditable => ConflictProblem("Only Draft versions can be edited."),
            QuestionOptionError.QuestionDoesNotSupportOptions => ConflictProblem(
                "Only multiple-choice questions support options."),
            QuestionOptionError.DisplayOrderExhausted => ConflictProblem(
                "The option display-order sequence is exhausted."),
            QuestionOptionError.ConcurrencyConflict => ConflictProblem(
                "The question options changed concurrently. Retry the request."),
            QuestionOptionError.InvalidText => BadRequestProblem("Question option text is invalid."),
            QuestionOptionError.InvalidLabel => BadRequestProblem("Question option label is invalid."),
            QuestionOptionError.InvalidExplanation => BadRequestProblem("Question option explanation is invalid."),
            QuestionOptionError.ConflictingPatchOperations => BadRequestProblem(
                "A replacement value and its clear flag cannot be supplied together."),
            QuestionOptionError.InvalidOptionOrder => BadRequestProblem(
                "OrderedOptionIds must contain every option exactly once."),
            _ => BadRequestProblem("The question option request is invalid.")
        };
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
