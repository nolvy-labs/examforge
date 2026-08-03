using ExamForge.Application.Abstractions;
using ExamForge.Application.Common;
using ExamForge.Domain.Users;

namespace ExamForge.Application.Auth;

public sealed class AuthService
{
    private readonly IUserRepository _users;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenService _refreshTokenService;

    public AuthService(
        IUserRepository users,
        IRefreshTokenRepository refreshTokens,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService)
    {
        _users = users;
        _refreshTokens = refreshTokens;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
    }

    public async Task<Result<AuthResponse, AuthError>> RegisterAsync(
        RegisterRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = User.NormalizeEmail(request.Email);

        if (await _users.ExistsByNormalizedEmailAsync(
                normalizedEmail,
                cancellationToken))
        {
            return Result<AuthResponse, AuthError>.Failure(
                AuthError.EmailAlreadyExists);
        }

        var passwordHash = _passwordHasher.Hash(request.Password);

        var user = new User(
            request.Email.Trim(),
            passwordHash,
            request.DisplayName,
            UserRole.Student);

        _users.Add(user);

        var response = IssueAuthTokens(user);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AuthResponse, AuthError>.Success(response);
    }

    public async Task<Result<AuthResponse, AuthError>> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = User.NormalizeEmail(request.Email);

        var user = await _users.GetByNormalizedEmailAsync(
            normalizedEmail,
            cancellationToken);

        if (user is null ||
            !user.IsActive ||
            !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Result<AuthResponse, AuthError>.Failure(
                AuthError.InvalidCredentials);
        }

        var response = IssueAuthTokens(user);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AuthResponse, AuthError>.Success(response);
    }

    public async Task<Result<AuthResponse, AuthError>> RefreshAsync(
        RefreshTokenRequest request,
        CancellationToken cancellationToken = default)
    {
        var oldTokenHash = _refreshTokenService.Hash(
            request.RefreshToken);

        var storedToken = await _refreshTokens.GetByTokenHashWithUserAsync(
            oldTokenHash,
            cancellationToken);

        if (storedToken is null ||
            !storedToken.IsActive ||
            !storedToken.User.IsActive)
        {
            return Result<AuthResponse, AuthError>.Failure(
                AuthError.InvalidRefreshToken);
        }

        var newRefreshToken = _refreshTokenService.Generate();

        storedToken.Revoke(newRefreshToken.TokenHash);

        _refreshTokens.Add(new RefreshToken(
            storedToken.UserId,
            newRefreshToken.TokenHash,
            newRefreshToken.ExpiresAtUtc));

        var response = CreateAuthResponse(
            storedToken.User,
            newRefreshToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AuthResponse, AuthError>.Success(response);
    }

    public async Task RevokeRefreshTokenAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        var tokenHash = _refreshTokenService.Hash(refreshToken);

        var storedToken = await _refreshTokens.GetByTokenHashAsync(
            tokenHash,
            cancellationToken);

        if (storedToken is null || !storedToken.IsActive)
        {
            return;
        }

        storedToken.Revoke();

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private AuthResponse IssueAuthTokens(User user)
    {
        var refreshToken = _refreshTokenService.Generate();

        _refreshTokens.Add(new RefreshToken(
            user.Id,
            refreshToken.TokenHash,
            refreshToken.ExpiresAtUtc));

        return CreateAuthResponse(user, refreshToken);
    }

    private AuthResponse CreateAuthResponse(
        User user,
        GeneratedRefreshToken refreshToken)
    {
        var accessToken = _jwtTokenService.CreateAccessToken(user);

        return new AuthResponse(
            CreateUserProfileResponse(user),
            accessToken.Token,
            accessToken.ExpiresAtUtc,
            refreshToken.Token,
            refreshToken.ExpiresAtUtc);
    }

    private static UserProfileResponse CreateUserProfileResponse(User user)
    {
        return new UserProfileResponse(
            user.Id,
            user.Email,
            user.DisplayName,
            user.Role);
    }
}