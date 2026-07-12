namespace ExamForge.Application.Abstractions;

public interface IRefreshTokenService
{
    string GenerateRefreshToken();

    string HashRefreshToken(string refreshToken);
}