using ExamForge.Api.Common.Constants;
using ExamForge.Application.Exams;
using ExamForge.Application.Exams.Dtos;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Admin.Exams;

[Route($"~/{ApiRoutes.V1}/admin/exams/{{examId:guid}}/versions/{{versionId:guid}}/sections")]
public sealed class ExamSectionsController : AdminBaseController
{
    private readonly ExamSectionService _examSectionService;

    public ExamSectionsController(ExamSectionService examSectionService)
    {
        _examSectionService = examSectionService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ExamSectionSummaryResponse>>> GetList(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken)
    {
        var result = await _examSectionService.GetListAsync(examId, versionId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpGet("{sectionId:guid}")]
    public async Task<ActionResult<ExamSectionDetailResponse>> GetById(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        CancellationToken cancellationToken)
    {
        var result = await _examSectionService.GetByIdAsync(
            examId,
            versionId,
            sectionId,
            cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpPost]
    public async Task<ActionResult<ExamSectionDetailResponse>> Create(
        Guid examId,
        Guid versionId,
        [FromBody] CreateExamSectionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _examSectionService.CreateAsync(
            examId,
            versionId,
            request,
            cancellationToken);

        if (!result.IsSuccess)
        {
            return ToActionResult(result.Error);
        }

        return CreatedAtAction(
            nameof(GetById),
            new { examId, versionId, sectionId = result.Value!.Id },
            result.Value);
    }

    [HttpPatch("{sectionId:guid}")]
    public async Task<ActionResult<ExamSectionDetailResponse>> Update(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        [FromBody] UpdateExamSectionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _examSectionService.UpdateAsync(
            examId,
            versionId,
            sectionId,
            request,
            cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpPut("order")]
    public async Task<ActionResult<IReadOnlyList<ExamSectionSummaryResponse>>> Reorder(
        Guid examId,
        Guid versionId,
        [FromBody] ReorderExamSectionsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _examSectionService.ReorderAsync(
            examId,
            versionId,
            request,
            cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpDelete("{sectionId:guid}")]
    public async Task<IActionResult> Delete(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        CancellationToken cancellationToken)
    {
        var error = await _examSectionService.DeleteAsync(
            examId,
            versionId,
            sectionId,
            cancellationToken);
        return error == ExamSectionError.None ? NoContent() : ToActionResult(error);
    }

    private ActionResult ToActionResult(ExamSectionError error)
    {
        var problem = error switch
        {
            ExamSectionError.ExamNotFound => CreateProblem(
                StatusCodes.Status404NotFound, "Not Found", "Exam was not found."),
            ExamSectionError.VersionNotFound => CreateProblem(
                StatusCodes.Status404NotFound, "Not Found", "Exam version was not found for this exam."),
            ExamSectionError.SectionNotFound => CreateProblem(
                StatusCodes.Status404NotFound, "Not Found", "Exam section was not found for this version."),
            ExamSectionError.ExamArchived => CreateConflict("Archived exams cannot be modified."),
            ExamSectionError.VersionNotEditable => CreateConflict("Only Draft versions can be edited."),
            ExamSectionError.DisplayOrderExhausted => CreateConflict(
                "The exam section display-order sequence is exhausted."),
            ExamSectionError.ConcurrencyConflict => CreateConflict(
                "The exam sections changed concurrently. Retry the request."),
            ExamSectionError.InvalidKind => CreateBadRequest("Exam section kind is invalid."),
            ExamSectionError.InvalidTitle => CreateBadRequest("Exam section title is invalid."),
            ExamSectionError.InvalidInstructions => CreateBadRequest("Exam section instructions are invalid."),
            ExamSectionError.InvalidStimulusText => CreateBadRequest("Exam section stimulus text is invalid."),
            ExamSectionError.InvalidMediaUrl => CreateBadRequest("Exam section media URL is invalid."),
            ExamSectionError.ConflictingPatchOperations => CreateBadRequest(
                "A replacement value and its clear flag cannot be supplied together."),
            ExamSectionError.InvalidSectionOrder => CreateBadRequest(
                "OrderedSectionIds must contain every section in this version exactly once."),
            _ => CreateBadRequest("The exam section request is invalid.")
        };

        return StatusCode(problem.Status!.Value, problem);
    }

    private ProblemDetails CreateBadRequest(string detail) =>
        CreateProblem(StatusCodes.Status400BadRequest, "Bad Request", detail);

    private ProblemDetails CreateConflict(string detail) =>
        CreateProblem(StatusCodes.Status409Conflict, "Conflict", detail);

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