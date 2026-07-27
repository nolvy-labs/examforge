using ExamForge.Application.Common;
using ExamForge.Application.Student.ExamAttempts.Abstractions;
using ExamForge.Application.Student.ExamAttempts.Errors;
using ExamForge.Application.Student.ExamAttempts.Scoring;
using ExamForge.Domain.ExamAttempts;

namespace ExamForge.Application.Student.ExamAttempts.Services;

public sealed class ExamAttemptExpirationFinalizer
{
    private readonly IExamAttemptRepository _repository;
    private readonly ExamAttemptScoringService _scoring;

    public ExamAttemptExpirationFinalizer(
        IExamAttemptRepository repository,
        ExamAttemptScoringService scoring)
    {
        _repository = repository;
        _scoring = scoring;
    }

    public async Task<Result<ExamAttempt, ExamAttemptError>> FinalizeIfExpiredAsync(
        ExamAttempt attempt,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken = default)
    {
        for (var retry = 0; retry < 3; retry++)
        {
            if (!attempt.IsExpired(nowUtc))
            {
                return Result<ExamAttempt, ExamAttemptError>.Success(attempt);
            }

            var score = _scoring.Calculate(attempt);
            if (!score.IsSuccess)
            {
                return Result<ExamAttempt, ExamAttemptError>.Failure(
                    ExamAttemptError.InvalidScoringConfiguration);
            }

            _scoring.Apply(attempt, score.Value!, attempt.ExpiresAtUtc!.Value);
            var save = await _repository.SaveAsync(attempt, cancellationToken);
            if (save.Saved)
            {
                return Result<ExamAttempt, ExamAttemptError>.Success(attempt);
            }

            var current = await _repository.GetAsync(attempt.Id, cancellationToken);
            if (current is null)
            {
                return Result<ExamAttempt, ExamAttemptError>.Failure(
                    ExamAttemptError.ConcurrencyConflict);
            }

            attempt = current;
        }

        return Result<ExamAttempt, ExamAttemptError>.Failure(
            ExamAttemptError.ConcurrencyConflict);
    }
}
