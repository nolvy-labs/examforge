using System.Net;
using System.Text;

using ExamForge.Infrastructure.Auth;

namespace ExamForge.Api.Configuration;

public sealed class HostingSettings
{
    public const string ProductionHost = "api.examforge.io.vn";

    public string AllowedHosts { get; set; } = string.Empty;
}

public sealed class CorsSettings
{
    public const string SectionName = "Cors";

    public string[] AllowedOrigins { get; set; } = [];
}

public sealed class ForwardedHeadersSettings
{
    public const string SectionName = "ForwardedHeaders";

    public int ForwardLimit { get; set; } = 1;

    public string[] KnownProxies { get; set; } = [];

    public string[] KnownNetworks { get; set; } = [];
}

public sealed class RateLimitingSettings
{
    public const string SectionName = "RateLimiting";

    public TokenBucketRateLimitSettings Global { get; set; } = new();

    public FixedWindowRateLimitSettings Authentication { get; set; } = new()
    {
        PermitLimit = 10
    };

    public FixedWindowRateLimitSettings Refresh { get; set; } = new()
    {
        PermitLimit = 30
    };
}

public sealed class TokenBucketRateLimitSettings
{
    public int TokenLimit { get; set; } = 120;

    public int TokensPerPeriod { get; set; } = 120;

    public int ReplenishmentPeriodSeconds { get; set; } = 60;

    public bool AutoReplenishment { get; set; } = true;

    public int QueueLimit { get; set; }
}

public sealed class FixedWindowRateLimitSettings
{
    public int PermitLimit { get; set; }

    public int WindowSeconds { get; set; } = 60;

    public int QueueLimit { get; set; }
}

public sealed class ApiHealthCheckSettings
{
    public const string SectionName = "HealthChecks";

    public int ReadinessTimeoutSeconds { get; set; } = 2;
}

public sealed class AuthHostingSettings
{
    public const string SectionName = "Auth";

    public bool AllowPublicRegistration { get; set; } = true;
}

public static class ProductionConfigurationValidation
{
    private static readonly string[] TrivialJwtSecrets =
    [
        "change-me",
        "changeme",
        "generate-with-openssl-rand-base64-32",
        "replace-me",
        "replace-with-a-long-random-secret-at-least-32-characters"
    ];

    public static bool HasValidProductionHost(string? allowedHosts) =>
        string.Equals(
            allowedHosts?.Trim(),
            HostingSettings.ProductionHost,
            StringComparison.OrdinalIgnoreCase);

    public static bool HasValidProductionCorsOrigins(CorsSettings settings) =>
        settings.AllowedOrigins.Length > 0 &&
        settings.AllowedOrigins.All(IsExactHttpsOrigin);

    public static bool HasValidForwardedHeaders(
        ForwardedHeadersSettings settings,
        bool requireTrustedSource) =>
        settings.ForwardLimit == 1 &&
        (!requireTrustedSource || settings.KnownProxies.Length + settings.KnownNetworks.Length > 0) &&
        settings.KnownProxies.All(value => IPAddress.TryParse(value, out _)) &&
        settings.KnownNetworks.All(value =>
            value.Contains('/', StringComparison.Ordinal) && IPNetwork.TryParse(value, out _));

    public static bool HasValidRateLimits(RateLimitingSettings settings) =>
        settings.Global.TokenLimit > 0 &&
        settings.Global.TokensPerPeriod > 0 &&
        settings.Global.ReplenishmentPeriodSeconds > 0 &&
        settings.Global.QueueLimit >= 0 &&
        IsValid(settings.Authentication) &&
        IsValid(settings.Refresh);

    public static bool HasValidHealthChecks(ApiHealthCheckSettings settings) =>
        settings.ReadinessTimeoutSeconds is > 0 and <= 30;

    public static bool HasValidJwt(JwtOptions settings) =>
        !string.IsNullOrWhiteSpace(settings.Issuer) &&
        !string.IsNullOrWhiteSpace(settings.Audience) &&
        !string.IsNullOrWhiteSpace(settings.Secret) &&
        Encoding.UTF8.GetByteCount(settings.Secret) >= 32 &&
        !TrivialJwtSecrets.Contains(settings.Secret.Trim(), StringComparer.OrdinalIgnoreCase) &&
        settings.AccessTokenMinutes is > 0 and <= 1_440 &&
        settings.RefreshTokenDays is > 0 and <= 365;

    private static bool IsExactHttpsOrigin(string value)
    {
        if (string.IsNullOrWhiteSpace(value) ||
            value.Contains('*', StringComparison.Ordinal) ||
            !Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
            !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(uri.Host) ||
            !string.IsNullOrEmpty(uri.UserInfo) ||
            !string.IsNullOrEmpty(uri.Query) ||
            !string.IsNullOrEmpty(uri.Fragment))
        {
            return false;
        }

        return string.Equals(
            value,
            uri.GetLeftPart(UriPartial.Authority),
            StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsValid(FixedWindowRateLimitSettings settings) =>
        settings.PermitLimit > 0 &&
        settings.WindowSeconds > 0 &&
        settings.QueueLimit >= 0;
}
