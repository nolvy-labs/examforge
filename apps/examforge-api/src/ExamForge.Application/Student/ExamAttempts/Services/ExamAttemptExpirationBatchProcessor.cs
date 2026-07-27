using ExamForge.Application.Student.ExamAttempts.Abstractions;

namespace ExamForge.Application.Student.ExamAttempts.Services;

public sealed record ExamAttemptExpirationBatchFailure(Guid AttemptId, string Error);
public sealed record ExamAttemptExpirationBatchResult(
    int FinalizedCount,
    IReadOnlyList<ExamAttemptExpirationBatchFailure> Failures);

public sealed class ExamAttemptExpirationBatchProcessor
{
    public const int BatchSize = 100;
    private readonly IExamAttemptRepository _repository;
    private readonly ExamAttemptExpirationFinalizer _finalizer;
    private readonly TimeProvider _timeProvider;

    public ExamAttemptExpirationBatchProcessor(
        IExamAttemptRepository repository,
        ExamAttemptExpirationFinalizer finalizer,
        TimeProvider timeProvider)
    {
        _repository = repository;
        _finalizer = finalizer;
        _timeProvider = timeProvider;
    }

    public async Task<ExamAttemptExpirationBatchResult> ProcessBatchAsync(
        CancellationToken cancellationToken = default)
    {
        var nowUtc = _timeProvider.GetUtcNow();
        var attempts = await _repository.GetExpiredBatchAsync(
            nowUtc,
            BatchSize,
            cancellationToken);
        var finalizedCount = 0;
        var failures = new List<ExamAttemptExpirationBatchFailure>();
        foreach (var attempt in attempts)
        {
            try
            {
                var result = await _finalizer.FinalizeIfExpiredAsync(
                    attempt,
                    nowUtc,
                    cancellationToken);
                if (result.IsSuccess)
                {
                    finalizedCount++;
                }
                else
                {
                    failures.Add(new(
                        attempt.Id,
                        result.Error.ToString()));
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                failures.Add(new(attempt.Id, exception.GetType().Name));
            }
        }

        return new ExamAttemptExpirationBatchResult(finalizedCount, failures);
    }
}
