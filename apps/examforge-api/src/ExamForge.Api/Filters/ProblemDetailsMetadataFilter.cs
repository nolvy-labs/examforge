using ExamForge.Api.Common;

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ExamForge.Api.Filters;

public sealed class ProblemDetailsMetadataFilter : IAlwaysRunResultFilter
{
    public void OnResultExecuting(ResultExecutingContext context)
    {
        if (context.Result is ObjectResult { Value: ProblemDetails problemDetails })
        {
            ProblemDetailsRequestMetadata.AddTo(problemDetails, context.HttpContext);
        }
    }

    public void OnResultExecuted(ResultExecutedContext context)
    {
    }
}
