using ExamForge.Application.Admin.ExamAttempts.Abstractions;
using ExamForge.Application.Admin.Users.Abstractions;
using ExamForge.Application.Admin.Users.Dtos;
using ExamForge.Application.Admin.Users.Errors;
using ExamForge.Application.Admin.Users.Models;
using ExamForge.Application.Common;
using ExamForge.Application.Student.ExamAttempts.Abstractions;
using ExamForge.Application.Student.ExamAttempts.Services;
using ExamForge.Domain.Users;

namespace ExamForge.Application.Admin.Users.Services;

public sealed class AdminUserService
{
    private readonly IAdminUserQuery _users;
    private readonly IAdminAttemptQuery _adminAttempts;
    private readonly IExamAttemptRepository _attempts;
    private readonly ExamAttemptExpirationFinalizer _finalizer;
    private readonly TimeProvider _timeProvider;

    public AdminUserService(
        IAdminUserQuery users,
        IAdminAttemptQuery adminAttempts,
        IExamAttemptRepository attempts,
        ExamAttemptExpirationFinalizer finalizer,
        TimeProvider timeProvider)
    {
        _users = users;
        _adminAttempts = adminAttempts;
        _attempts = attempts;
        _finalizer = finalizer;
        _timeProvider = timeProvider;
    }

    public async Task<Result<CollectionResponse<AdminUserResponse>, AdminUserError>> GetPageAsync(
        GetAdminUsersRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!TryParseRole(request.Role, out var role))
        {
            return Failure<CollectionResponse<AdminUserResponse>>(
                AdminUserError.InvalidUserRole);
        }

        if (!TryParseActive(request.IsActive, out var isActive))
        {
            return Failure<CollectionResponse<AdminUserResponse>>(
                AdminUserError.InvalidActiveStatus);
        }

        if (!TryParseSort(request.Sort, out var sort))
        {
            return Failure<CollectionResponse<AdminUserResponse>>(AdminUserError.InvalidSort);
        }

        if (request.PageSize is < 1 or > 100)
        {
            return Failure<CollectionResponse<AdminUserResponse>>(
                AdminUserError.InvalidPageSize);
        }

        if (request.Page < 1 || request.Page - 1 > int.MaxValue / request.PageSize)
        {
            return Failure<CollectionResponse<AdminUserResponse>>(AdminUserError.InvalidPage);
        }

        var page = await _users.GetPageAsync(
            new(
                string.IsNullOrWhiteSpace(request.Search) ? null : request.Search.Trim(),
                role,
                isActive,
                sort,
                checked((request.Page - 1) * request.PageSize),
                request.PageSize),
            cancellationToken);
        var totalPages = page.TotalItems == 0
            ? 0
            : (int)(((long)page.TotalItems + request.PageSize - 1) / request.PageSize);
        return Result<CollectionResponse<AdminUserResponse>, AdminUserError>.Success(
            new(
                page.Items.Select(ToResponse).ToList(),
                new(
                    request.Page,
                    request.PageSize,
                    page.TotalItems,
                    totalPages,
                    request.Page > 1 && page.TotalItems > 0,
                    request.Page < totalPages)));
    }

    public async Task<Result<AdminUserDetailResponse, AdminUserError>> GetDetailAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return Failure<AdminUserDetailResponse>(AdminUserError.UserNotFound);
        }

        var nowUtc = _timeProvider.GetUtcNow();
        var expiredIds = await _adminAttempts.GetExpiredIdsForUserAsync(
            userId,
            nowUtc,
            cancellationToken);
        foreach (var attemptId in expiredIds)
        {
            var attempt = await _attempts.GetAsync(attemptId, cancellationToken);
            if (attempt is null)
            {
                continue;
            }

            var finalized = await _finalizer.FinalizeIfExpiredAsync(
                attempt,
                nowUtc,
                cancellationToken);
            if (!finalized.IsSuccess)
            {
                return Failure<AdminUserDetailResponse>(
                    finalized.Error == ExamForge.Application.Student.ExamAttempts.Errors.ExamAttemptError
                        .InvalidScoringConfiguration
                            ? AdminUserError.InvalidScoringConfiguration
                            : AdminUserError.ConcurrencyConflict);
            }
        }

        var statistics = await _users.GetStatisticsAsync(userId, cancellationToken);
        return Result<AdminUserDetailResponse, AdminUserError>.Success(new(
            user.UserId,
            user.Email,
            user.DisplayName,
            user.Role,
            user.IsActive,
            user.CreatedAtUtc,
            user.UpdatedAtUtc,
            new(
                statistics.TotalAttempts,
                new(
                    statistics.InProgressAttempts,
                    statistics.SubmittedAttempts,
                    statistics.AbandonedAttempts),
                new(statistics.PracticeAttempts, statistics.ExamAttempts),
                statistics.AverageSubmittedPercentage,
                statistics.BestSubmittedPercentage,
                statistics.TotalAnsweredQuestions,
                statistics.LastAttemptAtUtc)));
    }

    private static bool TryParseRole(string? value, out UserRole? role)
    {
        role = null;
        if (value is null)
        {
            return true;
        }

        var parsed = value.Trim().ToLowerInvariant() switch
        {
            "student" => UserRole.Student,
            "admin" => UserRole.Admin,
            _ => (UserRole?)null
        };
        if (!parsed.HasValue)
        {
            return false;
        }

        role = parsed.Value;
        return true;
    }

    private static bool TryParseActive(string? value, out bool? active)
    {
        active = null;
        if (value is null)
        {
            return true;
        }

        if (!bool.TryParse(value.Trim(), out var parsed))
        {
            return false;
        }

        active = parsed;
        return true;
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

    private static AdminUserResponse ToResponse(AdminUserModel user) =>
        new(
            user.UserId,
            user.Email,
            user.DisplayName,
            user.Role,
            user.IsActive,
            user.CreatedAtUtc,
            user.UpdatedAtUtc);

    private static Result<T, AdminUserError> Failure<T>(AdminUserError error) =>
        Result<T, AdminUserError>.Failure(error);
}