using System.Globalization;
using System.Text.RegularExpressions;

using ExamForge.Application.Admin.ExamAttempts.Abstractions;
using ExamForge.Application.Admin.ExamAttempts.Dtos;
using ExamForge.Application.Admin.ExamAttempts.Errors;
using ExamForge.Application.Admin.ExamAttempts.Models;
using ExamForge.Application.Admin.Users.Models;
using ExamForge.Application.Common;
using ExamForge.Application.Student.ExamAttempts.Abstractions;
using ExamForge.Application.Student.ExamAttempts.Services;
using ExamForge.Domain.ExamAttempts;

namespace ExamForge.Application.Admin.ExamAttempts.Services;

public sealed partial class AdminAttemptService
{
    private readonly IAdminAttemptQuery _query;
    private readonly IExamAttemptRepository _attempts;
    private readonly ExamAttemptExpirationFinalizer _finalizer;
    private readonly TimeProvider _timeProvider;

    public AdminAttemptService(
        IAdminAttemptQuery query,
        IExamAttemptRepository attempts,
        ExamAttemptExpirationFinalizer finalizer,
        TimeProvider timeProvider)
    {
        _query = query;
        _attempts = attempts;
        _finalizer = finalizer;
        _timeProvider = timeProvider;
    }

    public Task<Result<CollectionResponse<AdminAttemptSummaryResponse>, AdminAttemptError>>
        GetForExamAsync(
            Guid examId,
            GetAdminAttemptsRequest request,
            CancellationToken cancellationToken = default) =>
        GetPageAsync(AdminAttemptScope.Exam, examId, request, cancellationToken);

    public Task<Result<CollectionResponse<AdminAttemptSummaryResponse>, AdminAttemptError>>
        GetForUserAsync(
            Guid userId,
            GetAdminAttemptsRequest request,
            CancellationToken cancellationToken = default) =>
        GetPageAsync(AdminAttemptScope.User, userId, request, cancellationToken);

    public async Task<Result<AdminAttemptDetailResponse, AdminAttemptError>> GetDetailAsync(
        Guid attemptId,
        CancellationToken cancellationToken = default)
    {
        if (!await _query.AttemptExistsAsync(attemptId, cancellationToken))
        {
            return Result<AdminAttemptDetailResponse, AdminAttemptError>.Failure(
                AdminAttemptError.AttemptNotFound);
        }

        var nowUtc = _timeProvider.GetUtcNow();
        var attempt = await _attempts.GetAsync(attemptId, cancellationToken);
        if (attempt is null)
        {
            return Result<AdminAttemptDetailResponse, AdminAttemptError>.Failure(
                AdminAttemptError.AttemptNotFound);
        }

        var finalization = await _finalizer.FinalizeIfExpiredAsync(
            attempt,
            nowUtc,
            cancellationToken);
        if (!finalization.IsSuccess)
        {
            return Result<AdminAttemptDetailResponse, AdminAttemptError>.Failure(
                MapFinalizationError(finalization.Error));
        }

        attempt = await _attempts.GetAsync(attemptId, cancellationToken);
        if (attempt is null)
        {
            return Result<AdminAttemptDetailResponse, AdminAttemptError>.Failure(
                AdminAttemptError.AttemptNotFound);
        }

        var includeGrading = attempt.Status == ExamAttemptStatus.Submitted;
        var detail = ExamAttemptDetailMapper.Map(
            attempt,
            nowUtc,
            new(IncludeSolutions: true, IncludeGrading: includeGrading));
        return Result<AdminAttemptDetailResponse, AdminAttemptError>.Success(
            new AdminAttemptDetailResponse(
                attempt.Id,
                attempt.Status,
                attempt.Mode,
                attempt.Revision,
                attempt.StartedAtUtc,
                attempt.ExpiresAtUtc,
                attempt.SubmittedAtUtc,
                attempt.AbandonedAtUtc,
                attempt.CreatedAtUtc,
                attempt.UpdatedAtUtc,
                new(attempt.StudentId, attempt.Student.DisplayName, attempt.Student.Email),
                new(
                    attempt.ExamId,
                    attempt.Exam.Title,
                    attempt.Exam.Slug,
                    attempt.Exam.Description,
                    attempt.Exam.Type),
                new(
                    attempt.ExamVersionId,
                    attempt.ExamVersion.VersionNumber,
                    attempt.ExamVersion.Title,
                    attempt.ExamVersion.Description,
                    attempt.ExamVersion.Instructions,
                    attempt.ExamVersion.DurationMinutes),
                new(
                    includeGrading ? attempt.Score : null,
                    includeGrading ? attempt.MaximumScore : null,
                    includeGrading
                        ? ExamAttemptDetailMapper.CalculatePercentage(
                            attempt.Score,
                            attempt.MaximumScore)
                        : null),
                detail.Sections));
    }

    private async Task<Result<CollectionResponse<AdminAttemptSummaryResponse>, AdminAttemptError>>
        GetPageAsync(
            AdminAttemptScope scope,
            Guid scopeId,
            GetAdminAttemptsRequest request,
            CancellationToken cancellationToken)
    {
        var validation = Validate(request);
        if (!validation.IsSuccess)
        {
            return Result<CollectionResponse<AdminAttemptSummaryResponse>, AdminAttemptError>
                .Failure(validation.Error);
        }

        var parentExists = scope == AdminAttemptScope.Exam
            ? await _query.ExamExistsAsync(scopeId, cancellationToken)
            : await _query.UserExistsAsync(scopeId, cancellationToken);
        if (!parentExists)
        {
            return Result<CollectionResponse<AdminAttemptSummaryResponse>, AdminAttemptError>
                .Failure(scope == AdminAttemptScope.Exam
                    ? AdminAttemptError.ExamNotFound
                    : AdminAttemptError.UserNotFound);
        }

        var parsed = validation.Value!;
        var nowUtc = _timeProvider.GetUtcNow();
        var expiredIds = scope == AdminAttemptScope.Exam
            ? await _query.GetExpiredIdsForExamAsync(scopeId, nowUtc, cancellationToken)
            : await _query.GetExpiredIdsForUserAsync(scopeId, nowUtc, cancellationToken);
        var finalizationError = await FinalizeAsync(expiredIds, nowUtc, cancellationToken);
        if (finalizationError != AdminAttemptError.None)
        {
            return Result<CollectionResponse<AdminAttemptSummaryResponse>, AdminAttemptError>
                .Failure(finalizationError);
        }

        var page = await _query.GetPageAsync(
            new AdminAttemptPageQuery(
                scope,
                scopeId,
                NormalizeSearch(request.Search),
                parsed.Status,
                parsed.Mode,
                parsed.CreatedFrom,
                parsed.CreatedTo,
                parsed.Sort,
                checked((request.Page - 1) * request.PageSize),
                request.PageSize),
            cancellationToken);
        var totalPages = page.TotalItems == 0
            ? 0
            : (int)(((long)page.TotalItems + request.PageSize - 1) / request.PageSize);
        var response = new CollectionResponse<AdminAttemptSummaryResponse>(
            page.Items.Select(ToResponse).ToList(),
            new(
                request.Page,
                request.PageSize,
                page.TotalItems,
                totalPages,
                request.Page > 1 && page.TotalItems > 0,
                request.Page < totalPages));
        return Result<CollectionResponse<AdminAttemptSummaryResponse>, AdminAttemptError>
            .Success(response);
    }

    private async Task<AdminAttemptError> FinalizeAsync(
        IReadOnlyList<Guid> attemptIds,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        foreach (var attemptId in attemptIds)
        {
            var attempt = await _attempts.GetAsync(attemptId, cancellationToken);
            if (attempt is null)
            {
                continue;
            }

            var result = await _finalizer.FinalizeIfExpiredAsync(
                attempt,
                nowUtc,
                cancellationToken);
            if (!result.IsSuccess)
            {
                return MapFinalizationError(result.Error);
            }
        }

        return AdminAttemptError.None;
    }

    private static Result<ParsedAttemptRequest, AdminAttemptError> Validate(
        GetAdminAttemptsRequest request)
    {
        if (!TryParseStatus(request.Status, out var status))
        {
            return Failure(AdminAttemptError.InvalidAttemptStatus);
        }

        if (!TryParseMode(request.Mode, out var mode))
        {
            return Failure(AdminAttemptError.InvalidAttemptMode);
        }

        if (!TryParseDate(request.CreatedFrom, out var createdFrom))
        {
            return Failure(AdminAttemptError.InvalidCreatedFrom);
        }

        if (!TryParseDate(request.CreatedTo, out var createdTo))
        {
            return Failure(AdminAttemptError.InvalidCreatedTo);
        }

        if (createdFrom.HasValue && createdTo.HasValue && createdFrom >= createdTo)
        {
            return Failure(AdminAttemptError.InvalidCreatedDateRange);
        }

        if (!TryParseSort(request.Sort, out var sort))
        {
            return Failure(AdminAttemptError.InvalidSort);
        }

        if (request.PageSize is < 1 or > 100)
        {
            return Failure(AdminAttemptError.InvalidPageSize);
        }

        if (request.Page < 1 || request.Page - 1 > int.MaxValue / request.PageSize)
        {
            return Failure(AdminAttemptError.InvalidPage);
        }

        return Result<ParsedAttemptRequest, AdminAttemptError>.Success(
            new(status, mode, createdFrom, createdTo, sort));
    }

    private static bool TryParseStatus(string? value, out ExamAttemptStatus? status)
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

    private static bool TryParseSort(string? value, out AdminCreatedAtSort sort)
    {
        switch (value?.Trim().ToLowerInvariant())
        {
            case "created-at-desc":
                sort = AdminCreatedAtSort.Descending;
                return true;
            case "created-at-asc":
                sort = AdminCreatedAtSort.Ascending;
                return true;
            default:
                sort = default;
                return false;
        }
    }

    private static bool TryParseDate(string? value, out DateTimeOffset? parsed)
    {
        parsed = null;
        if (value is null)
        {
            return true;
        }

        var trimmed = value.Trim();
        if (!ExplicitOffsetRegex().IsMatch(trimmed) ||
            !DateTimeOffset.TryParse(
                trimmed,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AllowWhiteSpaces,
                out var timestamp))
        {
            return false;
        }

        parsed = timestamp.ToUniversalTime();
        return true;
    }

    private static string? NormalizeSearch(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static AdminAttemptSummaryResponse ToResponse(AdminAttemptListModel attempt)
    {
        var submitted = attempt.Status == ExamAttemptStatus.Submitted;
        return new(
            attempt.AttemptId,
            attempt.Status,
            attempt.Mode,
            attempt.Revision,
            attempt.StartedAtUtc,
            attempt.ExpiresAtUtc,
            attempt.SubmittedAtUtc,
            attempt.AbandonedAtUtc,
            attempt.CreatedAtUtc,
            attempt.UpdatedAtUtc,
            new(attempt.UserId, attempt.UserDisplayName, attempt.UserEmail),
            new(attempt.ExamId, attempt.ExamTitle, attempt.ExamSlug),
            new(
                attempt.ExamVersionId,
                attempt.ExamVersionNumber,
                attempt.ExamVersionTitle),
            new(
                submitted ? attempt.Score : null,
                submitted ? attempt.MaximumScore : null,
                submitted
                    ? ExamAttemptDetailMapper.CalculatePercentage(
                        attempt.Score,
                        attempt.MaximumScore)
                    : null));
    }

    private static AdminAttemptError MapFinalizationError(
        ExamForge.Application.Student.ExamAttempts.Errors.ExamAttemptError error) =>
        error == ExamForge.Application.Student.ExamAttempts.Errors.ExamAttemptError
            .InvalidScoringConfiguration
            ? AdminAttemptError.InvalidScoringConfiguration
            : AdminAttemptError.ConcurrencyConflict;

    private static Result<ParsedAttemptRequest, AdminAttemptError> Failure(
        AdminAttemptError error) =>
        Result<ParsedAttemptRequest, AdminAttemptError>.Failure(error);

    private sealed record ParsedAttemptRequest(
        ExamAttemptStatus? Status,
        ExamAttemptMode? Mode,
        DateTimeOffset? CreatedFrom,
        DateTimeOffset? CreatedTo,
        AdminCreatedAtSort Sort);

    [GeneratedRegex(
        @"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})$",
        RegexOptions.IgnoreCase)]
    private static partial Regex ExplicitOffsetRegex();
}