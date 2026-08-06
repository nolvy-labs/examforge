using System.Globalization;

using ExamForge.Application.Admin.Users.Dtos;
using ExamForge.Application.Admin.Users.Errors;
using ExamForge.Application.Admin.Users.Services;
using ExamForge.Application.Common;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Admin.Users;

public sealed class UsersController : AdminBaseController
{
    private readonly AdminUserService _service;

    public UsersController(AdminUserService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<CollectionResponse<AdminUserResponse>>> GetPage(
        [FromQuery] string? search,
        [FromQuery] string? role,
        [FromQuery] string? isActive,
        [FromQuery] string? sort,
        [FromQuery] string? page,
        [FromQuery] string? pageSize,
        CancellationToken cancellationToken)
    {
        var defaults = new GetAdminUsersRequest();
        var request = new GetAdminUsersRequest(
            QueryValue("search", search),
            QueryValue("role", role),
            QueryValue("isActive", isActive),
            QueryValue("sort", sort ?? defaults.Sort),
            QueryInt("page", page, defaults.Page),
            QueryInt("pageSize", pageSize, defaults.PageSize));
        var result = await _service.GetPageAsync(request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    [HttpGet("{userId:guid}")]
    public async Task<ActionResult<AdminUserDetailResponse>> GetDetail(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetDetailAsync(userId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ToActionResult(result.Error);
    }

    private ActionResult ToActionResult(AdminUserError error)
    {
        var notFound = error == AdminUserError.UserNotFound;
        var conflict = error is AdminUserError.InvalidScoringConfiguration or
            AdminUserError.ConcurrencyConflict;
        var problem = new ProblemDetails
        {
            Status = notFound
                ? StatusCodes.Status404NotFound
                : conflict ? StatusCodes.Status409Conflict : StatusCodes.Status400BadRequest,
            Title = notFound ? "Not Found" : conflict ? "Conflict" : "Bad Request",
            Detail = error switch
            {
                AdminUserError.UserNotFound => "User was not found.",
                AdminUserError.InvalidUserRole => "Role is invalid.",
                AdminUserError.InvalidActiveStatus => "isActive must be 'true' or 'false'.",
                AdminUserError.InvalidSort =>
                    "Sort must be 'created-at-desc' or 'created-at-asc'.",
                AdminUserError.InvalidPage => "Page must be at least 1.",
                AdminUserError.InvalidPageSize => "Page size must be between 1 and 100.",
                AdminUserError.InvalidScoringConfiguration =>
                    "An expired attempt has an invalid scoring configuration.",
                AdminUserError.ConcurrencyConflict =>
                    "An expired attempt could not be finalized due to a concurrent update.",
                _ => "The admin-user request is invalid."
            },
            Instance = HttpContext.Request.Path
        };
        problem.Extensions["code"] = error switch
        {
            AdminUserError.UserNotFound => "user_not_found",
            AdminUserError.InvalidUserRole => "invalid_user_role",
            AdminUserError.InvalidActiveStatus => "invalid_active_status",
            AdminUserError.InvalidSort => "invalid_sort",
            AdminUserError.InvalidPage => "invalid_page",
            AdminUserError.InvalidPageSize => "invalid_page_size",
            AdminUserError.InvalidScoringConfiguration => "invalid_scoring_configuration",
            AdminUserError.ConcurrencyConflict => "concurrency_conflict",
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