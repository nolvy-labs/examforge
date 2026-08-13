using ExamForge.Application.Common;
using ExamForge.Application.Student.ExamClassifications.Dtos;
using ExamForge.Application.Student.ExamClassifications.Services;
using ExamForge.Application.Student.Exams.Dtos;
using ExamForge.Application.Student.Exams.Errors;
using ExamForge.Application.Student.Exams.Services;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Student.Exams;

public sealed class ExamsController : StudentBaseController
{
    private readonly StudentExamService _service;
    private readonly StudentExamDiscoveryService _discoveryService;

    public ExamsController(
        StudentExamService service,
        StudentExamDiscoveryService discoveryService)
    {
        _service = service;
        _discoveryService = discoveryService;
    }

    [HttpGet("filters")]
    public async Task<ActionResult<StudentExamFiltersResponse>> GetFilters(
        CancellationToken cancellationToken)
    {
        var response = await _discoveryService.GetFiltersAsync(cancellationToken);
        return Ok(response);
    }

    [HttpGet]
    public async Task<ActionResult<CollectionResponse<StudentExamListItemResponse>>> GetPage(
        [FromQuery] GetStudentExamsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetPageAsync(request, cancellationToken);
        return result.IsSuccess
            ? Ok(result.Value)
            : ToActionResult(result.Error, result.AdditionalData);
    }

    [HttpGet("{idOrSlug}")]
    public async Task<ActionResult<StudentExamSummaryResponse>> GetSummary(
        string idOrSlug, CancellationToken cancellationToken)
    {
        var result = await _service.GetSummaryAsync(idOrSlug, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    private ActionResult ToActionResult(
        StudentExamError error,
        object? additionalData = null)
    {
        if (error is StudentExamError.PublishedExamNotFound or
            StudentExamError.CategoryNotFound)
        {
            return NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Not Found",
                Detail = error switch
                {
                    StudentExamError.PublishedExamNotFound =>
                        "Published exam was not found.",
                    _ => "Exam category was not found."
                },
                Instance = HttpContext.Request.Path
            });
        }

        var detail = error switch
        {
            StudentExamError.InvalidPage => "Page must be at least 1.",
            StudentExamError.InvalidPageSize => "Page size must be between 1 and 100.",
            StudentExamError.InvalidSort => "Sort order is invalid.",
            StudentExamError.TooManyTagValues =>
                $"At most {StudentExamService.MaximumTagValues} tag values are allowed.",
            StudentExamError.InvalidTagIds =>
                "Every tag ID must identify a non-archived tag.",
            StudentExamError.InvalidCategorySelector => "Category selector is invalid.",
            _ => "The request is invalid."
        };
        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Bad Request",
            Detail = detail,
            Instance = HttpContext.Request.Path
        };
        if (additionalData is IReadOnlyCollection<Guid> invalidTagIds)
        {
            problem.Extensions["invalidTagIds"] = invalidTagIds;
        }

        return BadRequest(problem);
    }
}
