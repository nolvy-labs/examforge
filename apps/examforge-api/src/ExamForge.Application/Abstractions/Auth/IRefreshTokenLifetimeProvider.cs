namespace ExamForge.Application.Abstractions.Auth;

public interface IRefreshTokenLifetimeProvider
{
    DateTimeOffset GetExpiresAtUtc();
}