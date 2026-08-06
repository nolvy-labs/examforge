using System.Diagnostics;

using ExamForge.Api.Middleware;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Common;

public static class ProblemDetailsRequestMetadata
{
    public static void AddTo(ProblemDetails problemDetails, HttpContext context)
    {
        problemDetails.Extensions["correlationId"] = CorrelationIdContext.Get(context);
        problemDetails.Extensions["traceId"] = GetTraceId(context);
    }

    public static string GetTraceId(HttpContext context) =>
        Activity.Current?.Id ?? context.TraceIdentifier;
}
