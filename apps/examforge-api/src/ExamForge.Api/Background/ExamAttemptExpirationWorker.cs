using ExamForge.Api.Common.Logging;
using ExamForge.Application.Student.ExamAttempts.Services;

namespace ExamForge.Api.Background;

public sealed class ExamAttemptExpirationWorker : BackgroundService
{
    private static readonly TimeSpan Period = TimeSpan.FromSeconds(45);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExamAttemptExpirationWorker> _logger;

    public ExamAttemptExpirationWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<ExamAttemptExpirationWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RunIterationAsync(stoppingToken);
        using var timer = new PeriodicTimer(Period);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await RunIterationAsync(stoppingToken);
        }
    }

    private async Task RunIterationAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var processor = scope.ServiceProvider
                .GetRequiredService<ExamAttemptExpirationBatchProcessor>();
            var result = await processor.ProcessBatchAsync(cancellationToken);
            if (result.FinalizedCount > 0)
            {
                _logger.LogInformation(
                    LogEvents.ExamAttemptsExpired,
                    "Finalized {FinalizedAttemptCount} expired exam attempts",
                    result.FinalizedCount);
            }

            foreach (var failure in result.Failures)
            {
                _logger.LogWarning(
                    LogEvents.ExamAttemptExpirationFailed,
                    "Could not finalize expired attempt {AttemptId}: {Error}",
                    failure.AttemptId,
                    failure.Error);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception exception)
        {
            _logger.LogError(
                LogEvents.ExamAttemptExpirationBatchFailed,
                exception,
                "Expired exam-attempt batch processing failed; the worker will retry.");
        }
    }
}