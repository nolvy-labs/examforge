using ExamForge.Domain.Users;

namespace ExamForge.Application.Abstractions.Auth;

public interface IRefreshTokenRepository
{
    void Add(RefreshToken refreshToken);

    Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);

    Task<RefreshToken?> GetByTokenHashWithUserAsync(string tokenHash, CancellationToken cancellationToken = default);
}
