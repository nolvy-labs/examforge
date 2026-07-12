namespace ExamForge.Application.Abstractions;

public interface IRefreshTokenLifetimeProvider
{
    DateTimeOffset GetExpiresAtUtc();
}