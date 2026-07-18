using ExamForge.Api.Common.Constants;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Services;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Admin.Exams;

[Route($"~/{ApiRoutes.V1}/admin/exams/{{examId:guid}}/versions/{{versionId:guid}}/sections/{{sectionId:guid}}/questions")]
public sealed class QuestionsController : AdminBaseController
{
    private readonly AdminQuestionService _questions;

    public QuestionsController(AdminQuestionService questions)
    {
        _questions = questions;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<QuestionSummaryResponse>>> GetList(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        CancellationToken cancellationToken)
    {
        var result = await _questions.GetListAsync(examId, versionId, sectionId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpGet("{questionId:guid}")]
    public async Task<ActionResult<QuestionDetailResponse>> GetById(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken)
    {
        var result = await _questions.GetByIdAsync(
            examId,
            versionId,
            sectionId,
            questionId,
            cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpPost]
    public async Task<ActionResult<QuestionDetailResponse>> Create(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        [FromBody] CreateQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _questions.CreateAsync(
            examId,
            versionId,
            sectionId,
            request,
            cancellationToken);

        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error);
        }

        return CreatedAtAction(
            nameof(GetById),
            new { examId, versionId, sectionId, questionId = result.Value!.Id },
            result.Value);
    }

    [HttpPatch("{questionId:guid}")]
    public async Task<ActionResult<QuestionDetailResponse>> Update(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        [FromBody] UpdateQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _questions.UpdateAsync(
            examId,
            versionId,
            sectionId,
            questionId,
            request,
            cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpPut("order")]
    public async Task<ActionResult<IReadOnlyList<QuestionSummaryResponse>>> Reorder(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        [FromBody] ReorderQuestionsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _questions.ReorderAsync(
            examId,
            versionId,
            sectionId,
            request,
            cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpDelete("{questionId:guid}")]
    public async Task<IActionResult> Delete(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken)
    {
        var error = await _questions.DeleteAsync(
            examId,
            versionId,
            sectionId,
            questionId,
            cancellationToken);
        return error == QuestionError.None ? NoContent() : ToActionResult(error);
    }

    private ActionResult ToActionResult(QuestionError error)
    {
        var problem = error switch
        {
            QuestionError.ExamNotFound => NotFoundProblem("Exam was not found."),
            QuestionError.VersionNotFound => NotFoundProblem("Exam version was not found for this exam."),
            QuestionError.SectionNotFound => NotFoundProblem("Exam section was not found for this version."),
            QuestionError.QuestionNotFound => NotFoundProblem("Question was not found for this section."),
            QuestionError.ParentQuestionNotFound => NotFoundProblem("Parent question was not found for this section."),
            QuestionError.ExamArchived => ConflictProblem("Archived exams cannot be modified."),
            QuestionError.VersionNotEditable => ConflictProblem("Only Draft versions can be edited."),
            QuestionError.IncompatibleQuestionContent => ConflictProblem(
                "The question type is incompatible with its existing content."),
            QuestionError.DisplayOrderExhausted => ConflictProblem(
                "The question display-order sequence is exhausted."),
            QuestionError.ConcurrencyConflict => ConflictProblem(
                "The questions changed concurrently. Retry the request."),
            QuestionError.InvalidParentQuestion => BadRequestProblem(
                "Only a top-level Group can parent non-Group questions."),
            QuestionError.InvalidType => BadRequestProblem("Question type is invalid."),
            QuestionError.InvalidPrompt => BadRequestProblem("Question prompt is invalid."),
            QuestionError.InvalidExplanation => BadRequestProblem("Question explanation is invalid."),
            QuestionError.InvalidPoints => BadRequestProblem("Question points are invalid."),
            QuestionError.ConflictingPatchOperations => BadRequestProblem(
                "Explanation and ClearExplanation cannot be supplied together."),
            QuestionError.InvalidQuestionOrder => BadRequestProblem(
                "OrderedQuestionIds must contain the complete sibling set exactly once."),
            _ => BadRequestProblem("The question request is invalid.")
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
