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
    private readonly IRefreshTokenLifetimeProvider _refreshTokenLifetimeProvider;

    public AuthService(
        IUserRepository users,
        IRefreshTokenRepository refreshTokens,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService,
        IRefreshTokenLifetimeProvider refreshTokenLifetimeProvider)
    {
        _users = users;
        _refreshTokens = refreshTokens;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
        _refreshTokenLifetimeProvider = refreshTokenLifetimeProvider;
    }

    public async Task<Result<AuthResponse, AuthError>> RegisterAsync(
        RegisterRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = User.NormalizeEmail(request.Email);

        if (await _users.ExistsByNormalizedEmailAsync(normalizedEmail, cancellationToken))
        {
            return Result<AuthResponse, AuthError>.Failure(AuthError.EmailAlreadyExists);
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

        AddRefeshToken(user.Id, response.RefreshToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AuthResponse, AuthError>.Success(response);
    }

    public async Task<Result<AuthResponse, AuthError>> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = User.NormalizeEmail(request.Email);
        var user = await _users.GetByNormalizedEmailAsync(normalizedEmail, cancellationToken);

        if (user is null || !user.IsActive)
        {
            return Result<AuthResponse, AuthError>.Failure(AuthError.InvalidCredentials);
        }

        if (!_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Result<AuthResponse, AuthError>.Failure(AuthError.InvalidCredentials);
        }

        var response = CreateAuthResponse(user);

        AddRefeshToken(user.Id, response.RefreshToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AuthResponse, AuthError>.Success(response);
    }

    public async Task<Result<AuthResponse, AuthError>> RefreshAsync(
        RefreshTokenRequest request,
        CancellationToken cancellationToken = default)
    {
        var oldTokenHash = _refreshTokenService.HashRefreshToken(request.RefreshToken);

        var storedToken = await _refreshTokens.GetByTokenHashWithUserAsync(
            oldTokenHash,
            cancellationToken);

        if (storedToken is null || !storedToken.IsActive || !storedToken.User.IsActive)
        {
            return Result<AuthResponse, AuthError>.Failure(AuthError.InvalidRefreshToken);
        }

        var response = CreateAuthResponse(storedToken.User);

        var newTokenHash = _refreshTokenService.HashRefreshToken(response.RefreshToken);

        storedToken.Revoke(newTokenHash);

        _refreshTokens.Add(new RefreshToken(
            storedToken.UserId,
            newTokenHash,
            _refreshTokenLifetimeProvider.GetExpiresAtUtc()
        ));

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AuthResponse, AuthError>.Success(response);
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var tokenHash = _refreshTokenService.HashRefreshToken(refreshToken);

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

    private void AddRefeshToken(Guid userId, string refreshToken)
    {
        var refreshTokenHash = _refreshTokenService.HashRefreshToken(refreshToken);

        _refreshTokens.Add(new RefreshToken(
            userId,
            refreshTokenHash,
            _refreshTokenLifetimeProvider.GetExpiresAtUtc()
        ));
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
