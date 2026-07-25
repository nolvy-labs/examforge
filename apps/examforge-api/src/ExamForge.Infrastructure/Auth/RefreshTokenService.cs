using System.Security.Cryptography;
using System.Text;

using ExamForge.Application.Abstractions;
using ExamForge.Infrastructure.Auth;

using Microsoft.Extensions.Options;

public sealed class RefreshTokenService : IRefreshTokenService
{
    private readonly JwtOptions _jwtOptions;
    private readonly TimeProvider _timeProvider;

    public RefreshTokenService(
        IOptions<JwtOptions> jwtOptions,
        TimeProvider timeProvider)
    {
        _jwtOptions = jwtOptions.Value;
        _timeProvider = timeProvider;
    }

    public GeneratedRefreshToken Generate()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        var token = Convert.ToBase64String(bytes);
        var tokenHash = Hash(token);

        var expiresAtUtc = _timeProvider
            .GetUtcNow()
            .AddDays(_jwtOptions.RefreshTokenDays);

        return new GeneratedRefreshToken(
            token,
            tokenHash,
            expiresAtUtc);
    }

    public string Hash(string token)
    {
        var bytes = SHA256.HashData(
            Encoding.UTF8.GetBytes(token));

        return Convert.ToHexString(bytes);
    }
}