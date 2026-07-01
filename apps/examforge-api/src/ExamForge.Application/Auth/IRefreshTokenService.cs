namespace ExamForge.Application.Auth;

public interface IRefreshTokenService
{
    string GenerateRefreshToken();

    string HashRefreshToken(string refreshToken);
}