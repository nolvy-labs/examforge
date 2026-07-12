using ExamForge.Application.Abstractions;

using Microsoft.Extensions.Options;

namespace ExamForge.Infrastructure.Auth;

internal sealed class RefreshTokenLifetimeProvider : IRefreshTokenLifetimeProvider
{
    private readonly JwtOptions _jwtOptions;

    public RefreshTokenLifetimeProvider(IOptions<JwtOptions> jwtOptions)
    {
        _jwtOptions = jwtOptions.Value;
    }

    public DateTimeOffset GetExpiresAtUtc()
    {
        return DateTimeOffset.UtcNow.AddDays(_jwtOptions.RefreshTokenDays);
    }
}