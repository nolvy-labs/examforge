using ExamForge.Api.Common;
using ExamForge.Api.Common.Logging;

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace ExamForge.Api.Middleware;

public sealed class ApiExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiExceptionHandlingMiddleware> _logger;

    public ApiExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ApiExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = 499;
            }
        }
        catch (Exception exception)
        {
            await HandleExceptionAsync(context, exception);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var problem = CreateProblem(
            context,
            StatusCodes.Status500InternalServerError,
            "Internal Server Error",
            "An unexpected error occurred.");

        _logger.LogError(
            LogEvents.UnexpectedException,
            exception,
            "Unexpected exception while processing {HttpMethod} {RouteTemplate}; correlation {CorrelationId}; trace {TraceId}; user {UserId}",
            context.Request.Method,
            GetRouteTemplate(context),
            CorrelationIdContext.Get(context),
            ProblemDetailsRequestMetadata.GetTraceId(context),
            RequestLoggingMiddleware.GetAuthenticatedUserId(context));

        context.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";

        await context.Response.WriteAsJsonAsync(problem);
    }

    private static ProblemDetails CreateProblem(
        HttpContext context,
        int statusCode,
        string title,
        string detail)
    {
        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path
        };

        ProblemDetailsRequestMetadata.AddTo(problem, context);
        return problem;
    }

    private static string GetRouteTemplate(HttpContext context) =>
        context.GetEndpoint() is RouteEndpoint routeEndpoint
            ? routeEndpoint.RoutePattern.RawText ?? "unmatched"
            : "unmatched";
}