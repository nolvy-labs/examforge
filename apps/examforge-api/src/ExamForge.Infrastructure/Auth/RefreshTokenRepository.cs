using ExamForge.Application.Abstractions;
using ExamForge.Domain.Users;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Auth;

internal sealed class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly ExamForgeDbContext _dbContext;

    public RefreshTokenRepository(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public void Add(RefreshToken refreshToken)
    {
        _dbContext.RefreshTokens.Add(refreshToken);
    }

    public Task<RefreshToken?> GetByTokenHashAsync(
        string tokenHash,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.RefreshTokens
            .FirstOrDefaultAsync(
                token => token.TokenHash == tokenHash,
                cancellationToken);
    }

    public Task<RefreshToken?> GetByTokenHashWithUserAsync(
        string tokenHash,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.RefreshTokens
            .Include(token => token.User)
            .FirstOrDefaultAsync(
                token => token.TokenHash == tokenHash,
                cancellationToken);
    }
}
