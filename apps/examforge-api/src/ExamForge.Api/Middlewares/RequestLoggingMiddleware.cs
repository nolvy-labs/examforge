using System.Diagnostics;
using System.Security.Claims;

using ExamForge.Api.Common;
using ExamForge.Api.Common.Logging;
using ExamForge.Api.Configuration;

using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;

namespace ExamForge.Api.Middleware;

public sealed class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;
    private readonly RequestLoggingOptions _options;

    public RequestLoggingMiddleware(
        RequestDelegate next,
        ILogger<RequestLoggingMiddleware> logger,
        IOptions<RequestLoggingOptions> options)
    {
        _next = next;
        _logger = logger;
        _options = options.Value;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var started = Stopwatch.GetTimestamp();
        await _next(context);

        var statusCode = context.Response.StatusCode;
        var routeTemplate = GetRouteTemplate(context);
        if (routeTemplate is "/health/live" or "/health/ready" &&
            statusCode is >= 200 and < 400)
        {
            return;
        }

        var elapsedMilliseconds = Stopwatch.GetElapsedTime(started).TotalMilliseconds;
        var isSlow = elapsedMilliseconds >= _options.SlowRequestThresholdMilliseconds;
        var eventId = isSlow ? LogEvents.SlowRequest : LogEvents.RequestCompleted;
        var level = isSlow ? LogLevel.Warning : LogLevel.Information;

        _logger.Log(
            level,
            eventId,
            "HTTP {HttpMethod} {RouteTemplate} completed with {StatusCode} ({StatusCodeClass}) in {ElapsedMilliseconds} ms; correlation {CorrelationId}; trace {TraceId}; user {UserId}; scheme {RequestScheme}",
            context.Request.Method,
            routeTemplate,
            statusCode,
            GetStatusCodeClass(statusCode),
            Math.Round(elapsedMilliseconds, 3),
            CorrelationIdContext.Get(context),
            ProblemDetailsRequestMetadata.GetTraceId(context),
            GetAuthenticatedUserId(context),
            context.Request.Scheme);
    }

    private static string GetRouteTemplate(HttpContext context) =>
        context.GetEndpoint() is RouteEndpoint routeEndpoint
            ? routeEndpoint.RoutePattern.RawText ?? "unmatched"
            : "unmatched";

    private static string GetStatusCodeClass(int statusCode) =>
        statusCode is >= 100 and <= 599
            ? $"{statusCode / 100}xx"
            : "unknown";

    internal static Guid? GetAuthenticatedUserId(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        var value = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var userId) ? userId : null;
    }
}
