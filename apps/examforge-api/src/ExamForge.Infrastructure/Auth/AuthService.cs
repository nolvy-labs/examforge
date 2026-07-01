using ExamForge.Application.Auth;
using ExamForge.Application.Users;
using ExamForge.Domain.Users;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ExamForge.Infrastructure.Auth;

public sealed class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly ExamForgeDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly JwtOptions _jwtOptions;

    public AuthService(
        IUserRepository users,
        ExamForgeDbContext dbContext,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService,
        IOptions<JwtOptions> jwtOptions)
    {
        _users = users;
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
        _jwtOptions = jwtOptions.Value;
    }

    public async Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = User.NormalizeEmail(request.Email);

        if (await _users.ExistsByNormalizedEmailAsync(normalizedEmail, cancellationToken))
        {
            return AuthResult.Failure(AuthError.EmailAlreadyExists);
        }

        var passwordHash = _passwordHasher.Hash(request.Password);

        var user = new User(
            request.Email.Trim(),
            passwordHash,
            request.DisplayName,
            UserRole.Student
        );

        _users.Add(user);

        var response = CreateAuthResponse(user);

        var refreshTokenHash = _refreshTokenService.HashRefreshToken(response.RefreshToken);

        _dbContext.RefreshTokens.Add(new RefreshToken(
            user.Id,
            refreshTokenHash,
            DateTimeOffset.UtcNow.AddDays(_jwtOptions.RefreshTokenDays)
        ));

        await _dbContext.SaveChangesAsync(cancellationToken);

        return AuthResult.Success(response);
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = User.NormalizeEmail(request.Email);
        var user = await _users.GetByNormalizedEmailAsync(normalizedEmail, cancellationToken);

        if (user is null || !user.IsActive)
        {
            return AuthResult.Failure(AuthError.InvalidCredentials);
        }

        if (!_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return AuthResult.Failure(AuthError.InvalidCredentials);
        }

        var response = CreateAuthResponse(user);

        var refreshTokenHash = _refreshTokenService.HashRefreshToken(response.RefreshToken);

        _dbContext.RefreshTokens.Add(new RefreshToken(
            user.Id,
            refreshTokenHash,
            DateTimeOffset.UtcNow.AddDays(_jwtOptions.RefreshTokenDays)
        ));

        await _dbContext.SaveChangesAsync(cancellationToken);

        return AuthResult.Success(response);
    }

    public async Task<AuthResult> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        var oldTokenHash = _refreshTokenService.HashRefreshToken(request.RefreshToken);

        var storedToken = await _dbContext.RefreshTokens
            .Include(token => token.User)
            .FirstOrDefaultAsync(token => token.TokenHash == oldTokenHash, cancellationToken);

        if (storedToken is null || !storedToken.IsActive || !storedToken.User.IsActive)
        {
            return AuthResult.Failure(AuthError.InvalidRefreshToken);
        }

        var response = CreateAuthResponse(storedToken.User);

        var newTokenHash = _refreshTokenService.HashRefreshToken(response.RefreshToken);

        storedToken.Revoke(newTokenHash);

        _dbContext.RefreshTokens.Add(new RefreshToken(
            storedToken.UserId,
            newTokenHash,
            DateTimeOffset.UtcNow.AddDays(_jwtOptions.RefreshTokenDays)
        ));

        await _dbContext.SaveChangesAsync(cancellationToken);

        return AuthResult.Success(response);
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var tokenHash = _refreshTokenService.HashRefreshToken(refreshToken);

        var storedToken = await _dbContext.RefreshTokens
            .FirstOrDefaultAsync(token => token.TokenHash == tokenHash, cancellationToken);

        if (storedToken is null || !storedToken.IsActive)
        {
            return;
        }

        storedToken.Revoke();

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserProfileResponse?> GetMeAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);

        if (user is null || !user.IsActive)
        {
            return null;
        }

        return new UserProfileResponse(
            user.Id,
            user.Email,
            user.DisplayName,
            user.Role
        );
    }

    private AuthResponse CreateAuthResponse(User user)
    {
        var accessToken = _jwtTokenService.CreateAccessToken(user);
        var refreshToken = _refreshTokenService.GenerateRefreshToken();

        return new AuthResponse(
            accessToken.Token,
            refreshToken,
            accessToken.ExpiresAtUtc,
            new UserProfileResponse(
                user.Id,
                user.Email,
                user.DisplayName,
                user.Role
            )
        );
    }
}