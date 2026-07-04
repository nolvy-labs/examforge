namespace ExamForge.Application.Abstractions.Auth;

public interface IRefreshTokenService
{
    string GenerateRefreshToken();

    string HashRefreshToken(string refreshToken);
}