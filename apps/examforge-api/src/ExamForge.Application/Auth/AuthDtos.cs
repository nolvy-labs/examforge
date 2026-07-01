using ExamForge.Domain.Users;

namespace ExamForge.Application.Auth;

public sealed record RegisterRequest(
    string Email,
    string Password,
    string? DisplayName
);

public sealed record LoginRequest(
    string Email,
    string Password
);

public sealed record RefreshTokenRequest(
    string RefreshToken
);

public sealed record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTimeOffset AccessTokenExpiresAtUtc,
    UserProfileResponse User
);

public sealed record UserProfileResponse(
    Guid Id,
    string Email,
    string? DisplayName,
    UserRole Role
);