using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

using ExamForge.Application.Abstractions;
using ExamForge.Application.Auth;
using ExamForge.Domain.Users;
using ExamForge.Infrastructure.Auth;

using Microsoft.Extensions.Options;

namespace ExamForge.Api.Tests;

public sealed class AuthTokenFlowTests
{
    private const string Issuer = "ExamForge.Tests";
    private const string Audience = "ExamForge.Tests.Client";
    private const string Secret = "examforge-tests-only-secret-that-is-at-least-64-characters-long-123456789";

    [Fact]
    public async Task Login_IssuesAccessTokenWithRequiredProfileClaims()
    {
        var user = new User(
            "login@example.com",
            "password-hash",
            "Login User",
            UserRole.Student);
        var service = CreateService(
            new StubUserRepository(user),
            new StubRefreshTokenRepository());

        var result = await service.LoginAsync(new LoginRequest(user.Email, "password"));

        Assert.True(result.IsSuccess);
        AssertProfileClaims(result.Value!.AccessToken, user);
    }

    [Fact]
    public async Task Refresh_IssuesAccessTokenWithCurrentLoadedUserProfileClaims()
    {
        var currentUser = new User(
            "current@example.com",
            "password-hash",
            "Current User",
            UserRole.Admin);
        var storedToken = new RefreshToken(
            currentUser.Id,
            "old-token-hash",
            DateTimeOffset.UtcNow.AddDays(1));
        typeof(RefreshToken)
            .GetProperty(nameof(RefreshToken.User))!
            .SetValue(storedToken, currentUser);
        var service = CreateService(
            new StubUserRepository(null),
            new StubRefreshTokenRepository(storedToken));

        var result = await service.RefreshAsync(new RefreshTokenRequest("old-token"));

        Assert.True(result.IsSuccess);
        AssertProfileClaims(result.Value!.AccessToken, currentUser);
    }

    private static AuthService CreateService(
        IUserRepository users,
        IRefreshTokenRepository refreshTokens)
    {
        return new AuthService(
            users,
            refreshTokens,
            new StubUnitOfWork(),
            new AcceptingPasswordHasher(),
            new JwtTokenService(Options.Create(new JwtOptions
            {
                Issuer = Issuer,
                Audience = Audience,
                Secret = Secret,
                AccessTokenMinutes = 15
            })),
            new StubRefreshTokenService());
    }

    private static void AssertProfileClaims(string accessToken, User user)
    {
        var token = new JwtSecurityTokenHandler().ReadJwtToken(accessToken);

        Assert.Equal(Issuer, token.Issuer);
        Assert.Contains(Audience, token.Audiences);
        Assert.True(token.ValidTo > DateTime.UtcNow);
        Assert.Equal(user.Id.ToString(), token.Subject);
        Assert.Equal(
            user.Email,
            token.Claims.Single(claim => claim.Type == JwtRegisteredClaimNames.Email).Value);
        Assert.Equal(
            user.DisplayName,
            token.Claims.Single(claim => claim.Type == JwtRegisteredClaimNames.Name).Value);
        Assert.Equal(
            user.Role.ToString(),
            token.Claims.Single(claim => claim.Type == ClaimTypes.Role).Value);
        Assert.True(Guid.TryParse(
            token.Claims.Single(claim => claim.Type == JwtRegisteredClaimNames.Jti).Value,
            out _));
    }

    private sealed class StubUserRepository(User? user) : IUserRepository
    {
        public Task<User?> GetByNormalizedEmailAsync(
            string normalizedEmail,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(user);
        }

        public Task<bool> ExistsByNormalizedEmailAsync(
            string normalizedEmail,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(false);
        }

        public void Add(User addedUser)
        {
        }
    }

    private sealed class StubRefreshTokenRepository(RefreshToken? storedToken = null)
        : IRefreshTokenRepository
    {
        public void Add(RefreshToken refreshToken)
        {
        }

        public Task<RefreshToken?> GetByTokenHashAsync(
            string tokenHash,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(storedToken);
        }

        public Task<RefreshToken?> GetByTokenHashWithUserAsync(
            string tokenHash,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(storedToken);
        }
    }

    private sealed class StubUnitOfWork : IUnitOfWork
    {
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(1);
        }

        public Task<T> ExecuteInTransactionAsync<T>(
            Func<CancellationToken, Task<T>> operation,
            CancellationToken cancellationToken = default)
        {
            return operation(cancellationToken);
        }
    }

    private sealed class AcceptingPasswordHasher : IPasswordHasher
    {
        public string Hash(string password) => "password-hash";

        public bool Verify(string password, string passwordHash) => true;
    }

    private sealed class StubRefreshTokenService : IRefreshTokenService
    {
        public GeneratedRefreshToken Generate()
        {
            return new GeneratedRefreshToken(
                "new-token",
                "new-token-hash",
                DateTimeOffset.UtcNow.AddDays(7));
        }

        public string Hash(string token) => $"{token}-hash";
    }
}