using System.Security.Cryptography;
using System.Text;

using ExamForge.Application.Auth;

namespace ExamForge.Infrastructure.Auth;

public sealed class RefreshTokenService : IRefreshTokenService
{
    public string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    public string HashRefreshToken(string refreshToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken));
        return Convert.ToHexString(bytes);
    }
}