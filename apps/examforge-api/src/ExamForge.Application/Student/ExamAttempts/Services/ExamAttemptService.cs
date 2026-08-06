using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Common;
using ExamForge.Application.Student.ExamAttempts.Abstractions;
using ExamForge.Application.Student.ExamAttempts.Dtos;
using ExamForge.Application.Student.ExamAttempts.Enums;
using ExamForge.Application.Student.ExamAttempts.Errors;
using ExamForge.Application.Student.ExamAttempts.Models;
using ExamForge.Application.Student.ExamAttempts.Patch;
using ExamForge.Application.Student.ExamAttempts.Scoring;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Student.ExamAttempts.Services;

public sealed class ExamAttemptService
{
    private readonly IExamAttemptRepository _repository;
    private readonly ICurrentUserContext _currentUser;
    private readonly ExamAttemptScoringService _scoring;
    private readonly ExamAttemptExpirationFinalizer _expirationFinalizer;
    private readonly TimeProvider _timeProvider;

    public ExamAttemptService(
        IExamAttemptRepository repository,
        ICurrentUserContext currentUser,
        ExamAttemptScoringService scoring,
        ExamAttemptExpirationFinalizer expirationFinalizer,
        TimeProvider timeProvider)
    {
        _repository = repository;
        _currentUser = currentUser;
        _scoring = scoring;
        _expirationFinalizer = expirationFinalizer;
        _timeProvider = timeProvider;
    }

    public async Task<Result<ExamAttemptDetailResponse, ExamAttemptError>> CreateAsync(
        Guid examId,
        ExamAttemptMode mode = ExamAttemptMode.Practice,
        CancellationToken cancellationToken = default)
    {
        if (!_currentUser.UserId.HasValue)
        {
            return Failure(ExamAttemptError.CurrentUserUnavailable);
        }

        var studentId = _currentUser.UserId.Value;
        var nowUtc = _timeProvider.GetUtcNow();
        var version = await _repository.GetPublishedVersionAsync(examId, cancellationToken);
        if (version is null)
        {
            var exists = await _repository.ExamExistsAsync(examId, cancellationToken);
            return Failure(exists
                ? ExamAttemptError.PublishedVersionNotFound
                : ExamAttemptError.ExamNotFound);
        }

        if (mode == ExamAttemptMode.Exam && !version.DurationMinutes.HasValue)
        {
            return Failure(ExamAttemptError.ExamModeRequiresTimeLimit);
        }

        var existing = await _repository.GetActiveAsync(
            studentId, version.Id, cancellationToken);
        if (existing is not null)
        {
            var finalized = await FinalizeIfExpiredAsync(existing, nowUtc, cancellationToken);
            if (!finalized.IsSuccess)
            {
                return Failure(finalized.Error, finalized.AdditionalData);
            }

            if (finalized.Value!.Status == ExamAttemptStatus.InProgress)
            {
                return Failure(
                    ExamAttemptError.ActiveAttemptExists,
                    new ActiveAttemptConflict(finalized.Value.Id));
            }
        }

        DateTimeOffset? expiresAtUtc = mode == ExamAttemptMode.Exam
            ? nowUtc.AddMinutes(version.DurationMinutes!.Value)
            : null;
        var questionIds = version.Sections
            .SelectMany(section => section.Questions)
            .Where(question => question.Type != QuestionType.Group)
            .Select(question => question.Id)
            .ToList();
        var attempt = new ExamAttempt(
            studentId,
            examId,
            version.Id,
            mode,
            nowUtc,
            expiresAtUtc,
            questionIds);

        var create = await _repository.AddAsync(attempt, cancellationToken);
        if (!create.Created)
        {
            var racedAttempt = await _repository.GetActiveAsync(
                studentId,
                version.Id,
                cancellationToken);
            if (racedAttempt is not null)
            {
                var finalized = await FinalizeIfExpiredAsync(
                    racedAttempt,
                    nowUtc,
                    cancellationToken);
                if (!finalized.IsSuccess)
                {
                    return Failure(finalized.Error, finalized.AdditionalData);
                }

                if (finalized.Value!.Status == ExamAttemptStatus.InProgress)
                {
                    return Failure(
                        ExamAttemptError.ActiveAttemptExists,
                        new ActiveAttemptConflict(finalized.Value.Id));
                }
            }

            create = await _repository.AddAsync(attempt, cancellationToken);
            if (!create.Created)
            {
                return create.ExistingAttemptId.HasValue
                    ? Failure(
                        ExamAttemptError.ActiveAttemptExists,
                        new ActiveAttemptConflict(create.ExistingAttemptId.Value))
                    : Failure(ExamAttemptError.ConcurrencyConflict);
            }
        }

        var created = await _repository.GetOwnedAsync(attempt.Id, studentId, cancellationToken);
        return Result<ExamAttemptDetailResponse, ExamAttemptError>.Success(
            ToDetailResponse(created!, nowUtc));
    }

    public async Task<Result<ExamAttemptDetailResponse, ExamAttemptError>> GetDetailAsync(
        Guid attemptId,
        CancellationToken cancellationToken = default)
    {
        var loaded = await LoadOwnedAsync(attemptId, cancellationToken);
        if (!loaded.IsSuccess)
        {
            return Failure(loaded.Error);
        }

        var nowUtc = _timeProvider.GetUtcNow();
        var finalized = await FinalizeIfExpiredAsync(loaded.Value!, nowUtc, cancellationToken);
        return finalized.IsSuccess
            ? Result<ExamAttemptDetailResponse, ExamAttemptError>.Success(
                ToDetailResponse(finalized.Value!, nowUtc))
            : Failure(finalized.Error, finalized.AdditionalData);
    }

    public async Task<Result<ExamAttemptDetailResponse, ExamAttemptError>> PatchAsync(
        Guid attemptId,
        long expectedRevision,
        IReadOnlyList<PatchOperation>? operations,
        CancellationToken cancellationToken = default)
    {
        var loaded = await LoadOwnedAsync(attemptId, cancellationToken);
        if (!loaded.IsSuccess)
        {
            return Failure(loaded.Error);
        }

        var nowUtc = _timeProvider.GetUtcNow();
        var finalized = await FinalizeIfExpiredAsync(loaded.Value!, nowUtc, cancellationToken);
        if (!finalized.IsSuccess)
        {
            return Failure(finalized.Error, finalized.AdditionalData);
        }

        var attempt = finalized.Value!;
        if (attempt.Status != ExamAttemptStatus.InProgress)
        {
            return Failure(TerminalStateError(attempt.Status));
        }

        if (attempt.Revision != expectedRevision)
        {
            return Failure(
                ExamAttemptError.RevisionMismatch,
                new AttemptRevisionConflict(attempt.Revision));
        }

        var plan = ExamAttemptPatchApplier.Apply(operations, attempt);
        if (!plan.IsSuccess)
        {
            return Failure(ExamAttemptError.InvalidPatch, plan.Error);
        }

        attempt.ApplyAnswers(
            plan.Value!.Answers.Select(patch => new ExamAttemptAnswerUpdate(
                    patch.QuestionId,
                    patch.TextAnswer,
                    patch.SelectedOptionIds,
                    patch.ReplaceText,
                    patch.ReplaceSelectedOptions))
                .ToList(),
            nowUtc);
        var save = await _repository.SaveAsync(attempt, cancellationToken);
        if (!save.Saved)
        {
            return Failure(
                ExamAttemptError.RevisionMismatch,
                new AttemptRevisionConflict(save.CurrentRevision ?? expectedRevision));
        }

        return Result<ExamAttemptDetailResponse, ExamAttemptError>.Success(
            ToDetailResponse(attempt, nowUtc));
    }

    public async Task<Result<ExamAttemptDetailResponse, ExamAttemptError>> SubmitAsync(
        Guid attemptId,
        long expectedRevision,
        CancellationToken cancellationToken = default)
    {
        var loaded = await LoadOwnedAsync(attemptId, cancellationToken);
        if (!loaded.IsSuccess)
        {
            return Failure(loaded.Error);
        }

        var nowUtc = _timeProvider.GetUtcNow();
        var attempt = loaded.Value!;
        if (attempt.Status == ExamAttemptStatus.Submitted)
        {
            return Result<ExamAttemptDetailResponse, ExamAttemptError>.Success(
                ToDetailResponse(attempt, nowUtc));
        }

        if (attempt.Status == ExamAttemptStatus.Abandoned)
        {
            return Failure(ExamAttemptError.AttemptAlreadyAbandoned);
        }

        var finalized = await FinalizeIfExpiredAsync(attempt, nowUtc, cancellationToken);
        if (!finalized.IsSuccess)
        {
            return Failure(finalized.Error, finalized.AdditionalData);
        }

        attempt = finalized.Value!;
        if (attempt.Status == ExamAttemptStatus.Submitted)
        {
            return Result<ExamAttemptDetailResponse, ExamAttemptError>.Success(
                ToDetailResponse(attempt, nowUtc));
        }

        if (attempt.Revision != expectedRevision)
        {
            return Failure(
                ExamAttemptError.RevisionMismatch,
                new AttemptRevisionConflict(attempt.Revision));
        }

        var score = _scoring.Calculate(attempt);
        if (!score.IsSuccess)
        {
            return Failure(ExamAttemptError.InvalidScoringConfiguration);
        }

        _scoring.Apply(attempt, score.Value!, nowUtc);
        var save = await _repository.SaveAsync(attempt, cancellationToken);
        if (save.Saved)
        {
            return Result<ExamAttemptDetailResponse, ExamAttemptError>.Success(
                ToDetailResponse(attempt, nowUtc));
        }

        var current = await ReloadOwnedAsync(attemptId, cancellationToken);
        if (current?.Status == ExamAttemptStatus.Submitted)
        {
            return Result<ExamAttemptDetailResponse, ExamAttemptError>.Success(
                ToDetailResponse(current, nowUtc));
        }

        return Failure(
            ExamAttemptError.RevisionMismatch,
            new AttemptRevisionConflict(save.CurrentRevision ?? expectedRevision));
    }

    public async Task<Result<ExamAttemptDetailResponse, ExamAttemptError>> AbandonAsync(
        Guid attemptId,
        long expectedRevision,
        CancellationToken cancellationToken = default)
    {
        var loaded = await LoadOwnedAsync(attemptId, cancellationToken);
        if (!loaded.IsSuccess)
        {
            return Failure(loaded.Error);
        }

        var nowUtc = _timeProvider.GetUtcNow();
        var attempt = loaded.Value!;
        if (attempt.Status == ExamAttemptStatus.Abandoned)
        {
            return Result<ExamAttemptDetailResponse, ExamAttemptError>.Success(
                ToDetailResponse(attempt, nowUtc));
        }

        if (attempt.Status == ExamAttemptStatus.Submitted)
        {
            return Failure(ExamAttemptError.AttemptAlreadySubmitted);
        }

        var finalized = await FinalizeIfExpiredAsync(attempt, nowUtc, cancellationToken);
        if (!finalized.IsSuccess)
        {
            return Failure(finalized.Error, finalized.AdditionalData);
        }

        attempt = finalized.Value!;
        if (attempt.Status == ExamAttemptStatus.Submitted)
        {
            return Failure(ExamAttemptError.AttemptAlreadySubmitted);
        }

        if (attempt.Revision != expectedRevision)
        {
            return Failure(
                ExamAttemptError.RevisionMismatch,
                new AttemptRevisionConflict(attempt.Revision));
        }

        attempt.Abandon(nowUtc);
        var save = await _repository.SaveAsync(attempt, cancellationToken);
        if (save.Saved)
        {
            return Result<ExamAttemptDetailResponse, ExamAttemptError>.Success(
                ToDetailResponse(attempt, nowUtc));
        }

        var current = await ReloadOwnedAsync(attemptId, cancellationToken);
        if (current?.Status == ExamAttemptStatus.Abandoned)
        {
            return Result<ExamAttemptDetailResponse, ExamAttemptError>.Success(
                ToDetailResponse(current, nowUtc));
        }

        if (current?.Status == ExamAttemptStatus.Submitted)
        {
            return Failure(ExamAttemptError.AttemptAlreadySubmitted);
        }

        return Failure(
            ExamAttemptError.RevisionMismatch,
            new AttemptRevisionConflict(save.CurrentRevision ?? expectedRevision));
    }

    public async Task<Result<CollectionResponse<ExamAttemptListItemResponse>, ExamAttemptError>> GetPageAsync(
        GetExamAttemptsRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!_currentUser.UserId.HasValue)
        {
            return Result<CollectionResponse<ExamAttemptListItemResponse>, ExamAttemptError>.Failure(
                ExamAttemptError.CurrentUserUnavailable);
        }

        if (!TryParseStatus(request.Status, out var status))
        {
            return Result<CollectionResponse<ExamAttemptListItemResponse>, ExamAttemptError>.Failure(
                ExamAttemptError.InvalidAttemptStatus);
        }

        if (!TryParseMode(request.Mode, out var mode))
        {
            return Result<CollectionResponse<ExamAttemptListItemResponse>, ExamAttemptError>.Failure(
                ExamAttemptError.InvalidAttemptMode);
        }

        if (!TryParseSort(request.Sort, out var sort))
        {
            return Result<CollectionResponse<ExamAttemptListItemResponse>, ExamAttemptError>.Failure(
                ExamAttemptError.InvalidAttemptSort);
        }

        if (request.Page < 1)
        {
            return Result<CollectionResponse<ExamAttemptListItemResponse>, ExamAttemptError>.Failure(
                ExamAttemptError.InvalidPage);
        }

        if (request.PageSize is < 1 or > 100)
        {
            return Result<CollectionResponse<ExamAttemptListItemResponse>, ExamAttemptError>.Failure(
                ExamAttemptError.InvalidPageSize);
        }

        if (request.Page - 1 > int.MaxValue / request.PageSize)
        {
            return Result<CollectionResponse<ExamAttemptListItemResponse>, ExamAttemptError>.Failure(
                ExamAttemptError.InvalidPage);
        }

        var studentId = _currentUser.UserId.Value;
        var nowUtc = _timeProvider.GetUtcNow();
        var expired = await _repository.GetExpiredAsync(studentId, nowUtc, cancellationToken);
        foreach (var attempt in expired)
        {
            var finalized = await FinalizeIfExpiredAsync(attempt, nowUtc, cancellationToken);
            if (!finalized.IsSuccess)
            {
                return Result<CollectionResponse<ExamAttemptListItemResponse>, ExamAttemptError>.Failure(
                    finalized.Error);
            }
        }

        var page = await _repository.GetPageAsync(
            studentId,
            status,
            request.ExamId,
            sort,
            checked((request.Page - 1) * request.PageSize),
            request.PageSize,
            mode,
            cancellationToken);
        var totalPages = page.TotalItems == 0
            ? 0
            : (int)Math.Ceiling(page.TotalItems / (double)request.PageSize);
        var response = new CollectionResponse<ExamAttemptListItemResponse>(
            page.Items.Select(ToListItem).ToList(),
            new CollectionMeta(
                request.Page,
                request.PageSize,
                page.TotalItems,
                totalPages,
                request.Page > 1 && page.TotalItems > 0,
                request.Page < totalPages));
        return Result<CollectionResponse<ExamAttemptListItemResponse>, ExamAttemptError>.Success(response);
    }

    private static bool TryParseStatus(
        string? value,
        out ExamAttemptStatus? status)
    {
        status = value?.Trim().ToLowerInvariant() switch
        {
            null => null,
            "in-progress" => ExamAttemptStatus.InProgress,
            "submitted" => ExamAttemptStatus.Submitted,
            "abandoned" => ExamAttemptStatus.Abandoned,
            _ => null
        };
        return value is null || status.HasValue;
    }

    private static bool TryParseSort(
        string? value,
        out ExamAttemptSortOrder sort)
    {
        switch (value?.Trim().ToLowerInvariant())
        {
            case "created-at-desc":
                sort = ExamAttemptSortOrder.CreatedAtDescending;
                return true;
            case "created-at-asc":
                sort = ExamAttemptSortOrder.CreatedAtAscending;
                return true;
            default:
                sort = default;
                return false;
        }
    }

    private static bool TryParseMode(string? value, out ExamAttemptMode? mode)
    {
        mode = value?.Trim().ToLowerInvariant() switch
        {
            null => null,
            "practice" => ExamAttemptMode.Practice,
            "exam" => ExamAttemptMode.Exam,
            _ => null
        };
        return value is null || mode.HasValue;
    }

    private async Task<Result<ExamAttempt, ExamAttemptError>> LoadOwnedAsync(
        Guid attemptId,
        CancellationToken cancellationToken)
    {
        if (!_currentUser.UserId.HasValue)
        {
            return Result<ExamAttempt, ExamAttemptError>.Failure(
                ExamAttemptError.CurrentUserUnavailable);
        }

        var attempt = await _repository.GetOwnedAsync(
            attemptId,
            _currentUser.UserId.Value,
            cancellationToken);
        return attempt is null
            ? Result<ExamAttempt, ExamAttemptError>.Failure(ExamAttemptError.AttemptNotFound)
            : Result<ExamAttempt, ExamAttemptError>.Success(attempt);
    }

    private Task<ExamAttempt?> ReloadOwnedAsync(
        Guid attemptId,
        CancellationToken cancellationToken) =>
        _repository.GetOwnedAsync(
            attemptId,
            _currentUser.UserId!.Value,
            cancellationToken);

    private async Task<Result<ExamAttempt, ExamAttemptError>> FinalizeIfExpiredAsync(
        ExamAttempt attempt,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken) =>
        await _expirationFinalizer.FinalizeIfExpiredAsync(
            attempt,
            nowUtc,
            cancellationToken);

    private static ExamAttemptError TerminalStateError(ExamAttemptStatus status) =>
        status switch
        {
            ExamAttemptStatus.Submitted => ExamAttemptError.AttemptAlreadySubmitted,
            ExamAttemptStatus.Abandoned => ExamAttemptError.AttemptAlreadyAbandoned,
            _ => ExamAttemptError.InvalidAttemptState
        };

    private static ExamAttemptDetailResponse ToDetailResponse(
        ExamAttempt attempt,
        DateTimeOffset nowUtc) =>
        ExamAttemptDetailMapper.Map(
            attempt,
            nowUtc,
            new(
                IncludeSolutions: attempt.Status == ExamAttemptStatus.Submitted,
                IncludeGrading: attempt.Status == ExamAttemptStatus.Submitted));

    private static ExamAttemptListItemResponse ToListItem(ExamAttemptListModel attempt) =>
        new(
            attempt.AttemptId,
            attempt.ExamId,
            attempt.ExamVersionId,
            attempt.ExamTitle,
            attempt.ExamSlug,
            attempt.Status,
            attempt.Mode,
            attempt.StartedAtUtc,
            attempt.ExpiresAtUtc,
            attempt.SubmittedAtUtc,
            attempt.AbandonedAtUtc,
            attempt.Status == ExamAttemptStatus.Submitted ? attempt.Score : null,
            attempt.Status == ExamAttemptStatus.Submitted ? attempt.MaximumScore : null,
            attempt.Status == ExamAttemptStatus.Submitted
                ? ExamAttemptDetailMapper.CalculatePercentage(attempt.Score, attempt.MaximumScore)
                : null,
            attempt.Revision,
            attempt.CreatedAtUtc,
            attempt.UpdatedAtUtc);


    private static Result<ExamAttemptDetailResponse, ExamAttemptError> Failure(
        ExamAttemptError error,
        object? additionalData = null) =>
        additionalData is null
            ? Result<ExamAttemptDetailResponse, ExamAttemptError>.Failure(error)
            : Result<ExamAttemptDetailResponse, ExamAttemptError>.Failure(error, additionalData);
}