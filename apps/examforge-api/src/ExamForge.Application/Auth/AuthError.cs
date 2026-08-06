namespace ExamForge.Application.Auth;

public enum AuthError
{
    None = 0,
    InvalidCredentials = 1,
    EmailAlreadyExists = 2,
    InvalidRefreshToken = 3
}