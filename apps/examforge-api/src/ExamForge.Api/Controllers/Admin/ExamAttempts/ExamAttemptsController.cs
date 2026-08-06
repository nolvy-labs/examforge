using System.Globalization;

using ExamForge.Api.Common.Constants;
using ExamForge.Application.Admin.ExamAttempts.Dtos;
using ExamForge.Application.Admin.ExamAttempts.Errors;
using ExamForge.Application.Admin.ExamAttempts.Services;
using ExamForge.Application.Common;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Admin.ExamAttempts;

public sealed class ExamAttemptsController : AdminBaseController
{
    private readonly AdminAttemptService _service;

    public ExamAttemptsController(AdminAttemptService service)
    {
        _service = service;
    }

    [HttpGet($"~/{ApiRoutes.V1}/admin/exams/{{examId:guid}}/attempts")]
    public async Task<ActionResult<CollectionResponse<AdminAttemptSummaryResponse>>> GetForExam(
        Guid examId,
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? mode,
        [FromQuery] string? createdFrom,
        [FromQuery] string? createdTo,
        [FromQuery] string? sort,
        [FromQuery] string? page,
        [FromQuery] string? pageSize,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetForExamAsync(
            examId,
            BindRequest(search, status, mode, createdFrom, createdTo, sort, page, pageSize),
            cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpGet($"~/{ApiRoutes.V1}/admin/users/{{userId:guid}}/attempts")]
    public async Task<ActionResult<CollectionResponse<AdminAttemptSummaryResponse>>> GetForUser(
        Guid userId,
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? mode,
        [FromQuery] string? createdFrom,
        [FromQuery] string? createdTo,
        [FromQuery] string? sort,
        [FromQuery] string? page,
        [FromQuery] string? pageSize,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetForUserAsync(
            userId,
            BindRequest(search, status, mode, createdFrom, createdTo, sort, page, pageSize),
            cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpGet($"~/{ApiRoutes.V1}/admin/attempts/{{attemptId:guid}}")]
    public async Task<ActionResult<AdminAttemptDetailResponse>> GetDetail(
        Guid attemptId,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetDetailAsync(attemptId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    private GetAdminAttemptsRequest BindRequest(
        string? search,
        string? status,
        string? mode,
        string? createdFrom,
        string? createdTo,
        string? sort,
        string? page,
        string? pageSize)
    {
        var defaults = new GetAdminAttemptsRequest();
        return new(
            QueryValue("search", search),
            QueryValue("status", status),
            QueryValue("mode", mode),
            QueryValue("createdFrom", createdFrom),
            QueryValue("createdTo", createdTo),
            QueryValue("sort", sort ?? defaults.Sort),
            QueryInt("page", page, defaults.Page),
            QueryInt("pageSize", pageSize, defaults.PageSize));
    }

    private ActionResult ToActionResult(AdminAttemptError error)
    {
        var notFound = error is AdminAttemptError.UserNotFound or
            AdminAttemptError.ExamNotFound or AdminAttemptError.AttemptNotFound;
        var conflict = error is AdminAttemptError.InvalidScoringConfiguration or
            AdminAttemptError.ConcurrencyConflict;
        var problem = new ProblemDetails
        {
            Status = notFound
                ? StatusCodes.Status404NotFound
                : conflict ? StatusCodes.Status409Conflict : StatusCodes.Status400BadRequest,
            Title = notFound ? "Not Found" : conflict ? "Conflict" : "Bad Request",
            Detail = error switch
            {
                AdminAttemptError.UserNotFound => "User was not found.",
                AdminAttemptError.ExamNotFound => "Exam was not found.",
                AdminAttemptError.AttemptNotFound => "Exam attempt was not found.",
                AdminAttemptError.InvalidAttemptStatus =>
                    "Status must be 'in-progress', 'submitted', or 'abandoned'.",
                AdminAttemptError.InvalidAttemptMode => "Mode must be 'practice' or 'exam'.",
                AdminAttemptError.InvalidCreatedFrom =>
                    "createdFrom must be an ISO 8601 timestamp with an explicit offset.",
                AdminAttemptError.InvalidCreatedTo =>
                    "createdTo must be an ISO 8601 timestamp with an explicit offset.",
                AdminAttemptError.InvalidCreatedDateRange =>
                    "createdFrom must be earlier than createdTo.",
                AdminAttemptError.InvalidSort =>
                    "Sort must be 'created-at-desc' or 'created-at-asc'.",
                AdminAttemptError.InvalidPage => "Page must be at least 1.",
                AdminAttemptError.InvalidPageSize => "Page size must be between 1 and 100.",
                AdminAttemptError.InvalidScoringConfiguration =>
                    "An expired attempt has an invalid scoring configuration.",
                AdminAttemptError.ConcurrencyConflict =>
                    "An expired attempt could not be finalized due to a concurrent update.",
                _ => "The admin-attempt request is invalid."
            },
            Instance = HttpContext.Request.Path
        };
        problem.Extensions["code"] = error switch
        {
            AdminAttemptError.UserNotFound => "user_not_found",
            AdminAttemptError.ExamNotFound => "exam_not_found",
            AdminAttemptError.AttemptNotFound => "attempt_not_found",
            AdminAttemptError.InvalidAttemptStatus => "invalid_attempt_status",
            AdminAttemptError.InvalidAttemptMode => "invalid_attempt_mode",
            AdminAttemptError.InvalidCreatedFrom => "invalid_created_from",
            AdminAttemptError.InvalidCreatedTo => "invalid_created_to",
            AdminAttemptError.InvalidCreatedDateRange => "invalid_created_date_range",
            AdminAttemptError.InvalidSort => "invalid_sort",
            AdminAttemptError.InvalidPage => "invalid_page",
            AdminAttemptError.InvalidPageSize => "invalid_page_size",
            AdminAttemptError.InvalidScoringConfiguration => "invalid_scoring_configuration",
            AdminAttemptError.ConcurrencyConflict => "concurrency_conflict",
            _ => "invalid_request"
        };
        return StatusCode(problem.Status.Value, problem);
    }

    private string? QueryValue(string name, string? value) =>
        Request.Query.TryGetValue(name, out var raw) ? raw.ToString() : value;

    private int QueryInt(string name, string? value, int defaultValue)
    {
        value = QueryValue(name, value);
        if (value is null)
        {
            return defaultValue;
        }

        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : 0;
    }
}