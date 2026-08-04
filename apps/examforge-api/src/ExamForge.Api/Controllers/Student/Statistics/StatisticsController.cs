using ExamForge.Api.Common.Constants;
using ExamForge.Application.Abstractions;
using ExamForge.Application.Student.Statistics.Abstractions;
using ExamForge.Application.Student.Statistics.Enums;
using ExamForge.Application.Student.Statistics.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Student.Statistics;

[Authorize]
public sealed class StatisticsController : StudentBaseController
{
    private readonly ICurrentUserContext _currentUser;
    private readonly IStudentStatisticsQuery _query;

    public StatisticsController(
        ICurrentUserContext currentUser,
        IStudentStatisticsQuery query)
    {
        _currentUser = currentUser;
        _query = query;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardStatisticsModel>> GetDashboard(
        CancellationToken cancellationToken)
    {
        if (!_currentUser.UserId.HasValue)
        {
            return UnauthorizedProblem();
        }

        return Ok(await _query.GetDashboardAsync(
            _currentUser.UserId.Value,
            cancellationToken));
    }

    [HttpGet]
    public async Task<ActionResult<StudentStatisticsModel>> GetStatistics(
        [FromQuery] string period = "30d",
        [FromQuery] string mode = "all",
        CancellationToken cancellationToken = default)
    {
        if (!_currentUser.UserId.HasValue)
        {
            return UnauthorizedProblem();
        }

        if (!TryParsePeriod(period, out var resolvedPeriod))
        {
            return ValidationProblem(
                "invalid_statistics_period",
                "Period must be '30d', '90d', or 'all'.");
        }

        if (!TryParseMode(mode, out var resolvedMode))
        {
            return ValidationProblem(
                "invalid_statistics_mode",
                "Mode must be 'all', 'practice', or 'exam'.");
        }

        return Ok(await _query.GetStatisticsAsync(
            _currentUser.UserId.Value,
            resolvedPeriod,
            resolvedMode,
            cancellationToken));
    }

    private ObjectResult UnauthorizedProblem()
    {
        var problem = CreateProblem(
            StatusCodes.Status401Unauthorized,
            "Unauthorized",
            "The authenticated student identifier is unavailable.");
        problem.Extensions["code"] = "current_user_unavailable";
        return StatusCode(problem.Status!.Value, problem);
    }

    private ObjectResult ValidationProblem(string code, string detail)
    {
        var problem = CreateProblem(
            StatusCodes.Status400BadRequest,
            "Bad Request",
            detail);
        problem.Extensions["code"] = code;
        return StatusCode(problem.Status!.Value, problem);
    }

    private ProblemDetails CreateProblem(int status, string title, string detail) =>
        new()
        {
            Status = status,
            Title = title,
            Detail = detail,
            Instance = HttpContext.Request.Path
        };

    private static bool TryParsePeriod(string? value, out StatisticsPeriod period)
    {
        switch (value?.Trim().ToLowerInvariant())
        {
            case "30d": period = StatisticsPeriod.Last30Days; return true;
            case "90d": period = StatisticsPeriod.Last90Days; return true;
            case "all": period = StatisticsPeriod.All; return true;
            default: period = default; return false;
        }
    }

    private static bool TryParseMode(string? value, out StatisticsModeFilter mode)
    {
        switch (value?.Trim().ToLowerInvariant())
        {
            case "all": mode = StatisticsModeFilter.All; return true;
            case "practice": mode = StatisticsModeFilter.Practice; return true;
            case "exam": mode = StatisticsModeFilter.Exam; return true;
            default: mode = default; return false;
        }
    }
}