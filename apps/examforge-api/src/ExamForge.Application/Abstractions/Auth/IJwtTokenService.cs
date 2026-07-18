using ExamForge.Domain.Users;


namespace ExamForge.Application.Abstractions;

public interface IJwtTokenService
{
    AccessTokenResult CreateAccessToken(User user);
}

public sealed record AccessTokenResult(
    string Token,
    DateTimeOffset ExpiresAtUtc
);
