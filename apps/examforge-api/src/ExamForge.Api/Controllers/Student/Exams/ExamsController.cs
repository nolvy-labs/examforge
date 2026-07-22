using ExamForge.Application.Common;
using ExamForge.Application.Student.Exams.Dtos;
using ExamForge.Application.Student.Exams.Errors;
using ExamForge.Application.Student.Exams.Services;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Student.Exams;

public sealed class ExamsController : StudentBaseController
{
    private readonly StudentExamService _service;

    public ExamsController(StudentExamService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<CollectionResponse<StudentExamListItemResponse>>> GetPage(
        [FromQuery] GetStudentExamsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetPageAsync(request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpGet("{idOrSlug}")]
    public async Task<ActionResult<StudentExamSummaryResponse>> GetSummary(
        string idOrSlug, CancellationToken cancellationToken)
    {
        var result = await _service.GetSummaryAsync(idOrSlug, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpGet("{idOrSlug}/full-test")]
    public async Task<ActionResult<StudentFullTestResponse>> GetFullTest(
        string idOrSlug,
        [FromQuery(Name = "include-solutions")] bool includeSolutions = false,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.GetFullTestAsync(idOrSlug, includeSolutions, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpGet("{idOrSlug}/first-section")]
    public async Task<ActionResult<StudentSingleSectionResponse>> GetFirstSection(
        string idOrSlug,
        [FromQuery(Name = "include-solutions")] bool includeSolutions = false,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.GetFirstSectionAsync(idOrSlug, includeSolutions, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpGet("{idOrSlug}/sections/{sectionId:guid}")]
    public async Task<ActionResult<StudentSingleSectionResponse>> GetSection(
        string idOrSlug,
        Guid sectionId,
        [FromQuery(Name = "include-solutions")] bool includeSolutions = false,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.GetSectionAsync(idOrSlug, sectionId, includeSolutions, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    private ActionResult ToActionResult(StudentExamError error)
    {
        if (error is StudentExamError.PublishedExamNotFound or StudentExamError.SectionNotFound)
        {
            return NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Not Found",
                Detail = error == StudentExamError.PublishedExamNotFound
                    ? "Published exam was not found."
                    : "Exam section was not found.",
                Instance = HttpContext.Request.Path
            });
        }

        var detail = error switch
        {
            StudentExamError.InvalidPage => "Page must be at least 1.",
            StudentExamError.InvalidPageSize => "Page size must be between 1 and 100.",
            StudentExamError.InvalidSort => "Sort order is invalid.",
            StudentExamError.InvalidTagSelector => "Tag selector is invalid.",
            StudentExamError.InvalidCategorySelector => "Category selector is invalid.",
            _ => "The request is invalid."
        };
        return BadRequest(new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Bad Request",
            Detail = detail,
            Instance = HttpContext.Request.Path
        });
    }
}