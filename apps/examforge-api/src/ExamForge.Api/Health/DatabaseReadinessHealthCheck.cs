using ExamForge.Api.Configuration;
using ExamForge.Infrastructure.Persistence;

using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace ExamForge.Api.Health;

public sealed class DatabaseReadinessHealthCheck : IHealthCheck
{
    private readonly ExamForgeDbContext _dbContext;
    private readonly ApiHealthCheckSettings _settings;

    public DatabaseReadinessHealthCheck(
        ExamForgeDbContext dbContext,
        IOptions<ApiHealthCheckSettings> settings)
    {
        _dbContext = dbContext;
        _settings = settings.Value;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(_settings.ReadinessTimeoutSeconds));

        try
        {
            return await _dbContext.Database.CanConnectAsync(timeout.Token)
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy("PostgreSQL is unavailable.");
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return HealthCheckResult.Unhealthy("PostgreSQL readiness check timed out.");
        }
        catch (Exception)
        {
            return HealthCheckResult.Unhealthy("PostgreSQL is unavailable.");
        }
    }
}
