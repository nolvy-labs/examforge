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
    UserProfileResponse User,
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAtUtc,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAtUtc
);

public sealed record UserProfileResponse(
    Guid Id,
    string Email,
    string? DisplayName,
    UserRole Role
);