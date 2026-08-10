using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.RateLimiting;

using ExamForge.Api.Common;
using ExamForge.Api.Configuration;

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ExamForge.Api.Extensions;

public static class RateLimitingExtensions
{
    public const string AuthenticationPolicy = "authentication";
    public const string RefreshPolicy = "refresh";

    public static IServiceCollection AddApiRateLimiting(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddOptions<RateLimitingSettings>()
            .Bind(configuration.GetSection(RateLimitingSettings.SectionName))
            .Validate(
                ProductionConfigurationValidation.HasValidRateLimits,
                "Rate limits and periods must be positive and queue limits cannot be negative.")
            .ValidateOnStart();

        var settings = configuration
            .GetSection(RateLimitingSettings.SectionName)
            .Get<RateLimitingSettings>() ?? new RateLimitingSettings();

        services.AddRateLimiter(options =>
        {
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                if (HttpMethods.IsOptions(context.Request.Method))
                {
                    return RateLimitPartition.GetNoLimiter("cors-preflight");
                }

                var partitionKey = GetAuthenticatedUserId(context.User) is { } userId
                    ? $"user:{userId:D}"
                    : $"ip:{GetClientIp(context)}";

                return RateLimitPartition.GetTokenBucketLimiter(
                    partitionKey,
                    _ => new TokenBucketRateLimiterOptions
                    {
                        TokenLimit = settings.Global.TokenLimit,
                        TokensPerPeriod = settings.Global.TokensPerPeriod,
                        ReplenishmentPeriod = TimeSpan.FromSeconds(
                            settings.Global.ReplenishmentPeriodSeconds),
                        AutoReplenishment = settings.Global.AutoReplenishment,
                        QueueLimit = settings.Global.QueueLimit,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                    });
            });

            options.AddPolicy(AuthenticationPolicy, context =>
                CreateFixedWindowPartition(context, settings.Authentication));
            options.AddPolicy(RefreshPolicy, context =>
                CreateFixedWindowPartition(context, settings.Refresh));

            options.OnRejected = async (context, cancellationToken) =>
            {
                if (context.Lease.TryGetMetadata(
                        MetadataName.RetryAfter,
                        out var retryAfter))
                {
                    var seconds = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds));
                    context.HttpContext.Response.Headers.RetryAfter =
                        seconds.ToString(CultureInfo.InvariantCulture);
                }

                var problem = new ProblemDetails
                {
                    Status = StatusCodes.Status429TooManyRequests,
                    Title = "Too Many Requests",
                    Detail = "Too many requests. Try again later.",
                    Instance = context.HttpContext.Request.Path
                };
                ProblemDetailsRequestMetadata.AddTo(problem, context.HttpContext);

                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.HttpContext.Response.ContentType = "application/problem+json";
                await JsonSerializer.SerializeAsync(
                    context.HttpContext.Response.Body,
                    problem,
                    cancellationToken: cancellationToken);
            };
        });

        return services;
    }

    private static RateLimitPartition<string> CreateFixedWindowPartition(
        HttpContext context,
        FixedWindowRateLimitSettings settings) =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetClientIp(context),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = settings.PermitLimit,
                Window = TimeSpan.FromSeconds(settings.WindowSeconds),
                AutoReplenishment = true,
                QueueLimit = settings.QueueLimit,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            });

    internal static Guid? GetAuthenticatedUserId(ClaimsPrincipal user)
    {
        if (user.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        var value = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(value, out var userId) ? userId : null;
    }

    internal static string GetClientIp(HttpContext context)
    {
        var address = context.Connection.RemoteIpAddress;
        if (address is null)
        {
            return "unknown";
        }

        if (address.IsIPv4MappedToIPv6)
        {
            address = address.MapToIPv4();
        }

        return address.ToString();
    }
}
