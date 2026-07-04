using ExamForge.Domain.Users;

namespace ExamForge.Application.Abstractions.Auth;

public interface IJwtTokenService
{
    AccessTokenResult CreateAccessToken(User user);
}

public sealed record AccessTokenResult(
    string Token,
    DateTimeOffset ExpiresAtUtc
);