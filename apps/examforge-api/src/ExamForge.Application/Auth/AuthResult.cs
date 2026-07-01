namespace ExamForge.Application.Auth;

public sealed class AuthResult
{
    private AuthResult(AuthResponse? value, AuthError error)
    {
        Value = value;
        Error = error;
    }

    public AuthResponse? Value { get; }

    public AuthError Error { get; }

    public bool IsSuccess => Error == AuthError.None;

    public static AuthResult Success(AuthResponse value)
    {
        return new AuthResult(value, AuthError.None);
    }

    public static AuthResult Failure(AuthError error)
    {
        return new AuthResult(null, error);
    }
}

public enum AuthError
{
    None = 0,
    InvalidCredentials = 1,
    EmailAlreadyExists = 2,
    InvalidRefreshToken = 3
}