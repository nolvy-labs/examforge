using System.Collections.ObjectModel;

namespace ExamForge.Api.Middleware;

public static class CorrelationIdContext
{
    public const string HeaderName = "X-Correlation-ID";
    internal const string ItemKey = "ExamForge.CorrelationId";

    public static string Get(HttpContext context) =>
        context.Items.TryGetValue(ItemKey, out var value) && value is string correlationId
            ? correlationId
            : string.Empty;
}

public sealed class CorrelationIdMiddleware
{
    public const int MaximumLength = 128;
    private readonly RequestDelegate _next;
    private readonly ILogger<CorrelationIdMiddleware> _logger;

    public CorrelationIdMiddleware(
        RequestDelegate next,
        ILogger<CorrelationIdMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = GetOrCreate(context);
        context.Items[CorrelationIdContext.ItemKey] = correlationId;
        context.Response.Headers[CorrelationIdContext.HeaderName] = correlationId;
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[CorrelationIdContext.HeaderName] = correlationId;
            return Task.CompletedTask;
        });

        using (_logger.BeginScope(new ReadOnlyDictionary<string, object?>(
            new Dictionary<string, object?>
            {
                ["CorrelationId"] = correlationId
            })))
        {
            await _next(context);
        }
    }

    private static string GetOrCreate(HttpContext context)
    {
        var values = context.Request.Headers[CorrelationIdContext.HeaderName];
        if (values.Count == 1 && IsValid(values[0]))
        {
            return values[0]!;
        }

        return Guid.NewGuid().ToString("N");
    }

    private static bool IsValid(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > MaximumLength)
        {
            return false;
        }

        foreach (var character in value)
        {
            if (!char.IsAsciiLetterOrDigit(character) && character is not ('-' or '_' or '.'))
            {
                return false;
            }
        }

        return true;
    }
}
