using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Application.Admin.Exams.Utils;
using ExamForge.Application.Common;
using ExamForge.Domain.Common;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Services;

public sealed class AdminExamVersionService
{
    private readonly IAdminExamVersionRepository _versions;
    private readonly IAdminExamVersionContentCloner _contentCloner;
    private readonly IAdminExamVersionPublishReadinessChecker _readinessChecker;
    private readonly ICurrentUserContext _currentUser;
    private readonly IUnitOfWork _unitOfWork;
    private readonly NestedExamContentFactory _contentFactory;
    private readonly NestedExamContentPersistence? _contentPersistence;

    public AdminExamVersionService(
        IAdminExamVersionRepository versions,
        IAdminExamVersionContentCloner contentCloner,
        IAdminExamVersionPublishReadinessChecker readinessChecker,
        ICurrentUserContext currentUser,
        IUnitOfWork unitOfWork,
        NestedExamContentFactory? contentFactory = null,
        NestedExamContentPersistence? contentPersistence = null)
    {
        _versions = versions;
        _contentCloner = contentCloner;
        _readinessChecker = readinessChecker;
        _currentUser = currentUser;
        _unitOfWork = unitOfWork;
        _contentFactory = contentFactory ?? new NestedExamContentFactory();
        _contentPersistence = contentPersistence;
    }

    public async Task<Result<CollectionResponse<ExamVersionSummaryResponse>, ExamVersionError>> GetPageAsync(
        Guid examId,
        GetExamVersionsRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request is null ||
            request.Page < 1 ||
            request.PageSize is < 1 or > ExamVersionConstraints.MaxPageSize ||
            !Enum.IsDefined(request.Sort))
        {
            return Result<CollectionResponse<ExamVersionSummaryResponse>, ExamVersionError>.Failure(
                ExamVersionError.InvalidPagination);
        }


        if (request.Status.HasValue && !Enum.IsDefined(request.Status.Value))
        {
            return Result<CollectionResponse<ExamVersionSummaryResponse>, ExamVersionError>.Failure(
                ExamVersionError.InvalidStatus);
        }

        var skip = ((long)request.Page - 1) * request.PageSize;

        if (skip > int.MaxValue)
        {
            return Result<CollectionResponse<ExamVersionSummaryResponse>, ExamVersionError>.Failure(
                ExamVersionError.InvalidPagination);
        }

        if (!await _versions.ExamExistsAsync(examId, cancellationToken))
        {
            return Result<CollectionResponse<ExamVersionSummaryResponse>, ExamVersionError>.Failure(
                ExamVersionError.ExamNotFound);
        }

        var page = await _versions.GetPageAsync(
            examId,
            new ExamVersionPageQuery(
                (int)skip,
                request.PageSize,
                request.Status,
                request.Sort),
            cancellationToken);
        var totalPages = page.TotalItems == 0
            ? 0
            : (int)(((long)page.TotalItems + request.PageSize - 1) / request.PageSize);
        var response = new CollectionResponse<ExamVersionSummaryResponse>(
            page.Items.Select(ToSummaryResponse).ToList(),
            new CollectionMeta(
                request.Page,
                request.PageSize,
                page.TotalItems,
                totalPages,
                request.Page > 1,
                request.Page < totalPages));

        return Result<CollectionResponse<ExamVersionSummaryResponse>, ExamVersionError>.Success(response);
    }

    public async Task<Result<ExamVersionDetailResponse, ExamVersionError>> GetByIdAsync(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken = default)
    {
        if (!await _versions.ExamExistsAsync(examId, cancellationToken))
        {
            return Failure(ExamVersionError.ExamNotFound);
        }

        var version = await _versions.GetDetailAsync(examId, versionId, cancellationToken);
        return version is null
            ? Failure(ExamVersionError.VersionNotFound)
            : Success(ToDetailResponse(version));
    }

    public async Task<Result<ExamVersionDetailResponse, ExamVersionError>> GetCurrentPublishedAsync(
        Guid examId,
        CancellationToken cancellationToken = default)
    {
        if (!await _versions.ExamExistsAsync(examId, cancellationToken))
        {
            return Failure(ExamVersionError.ExamNotFound);
        }

        var version = await _versions.GetCurrentPublishedAsync(examId, cancellationToken);
        return version is null
            ? Failure(ExamVersionError.PublishedVersionNotFound)
            : Success(ToDetailResponse(version));
    }

    public async Task<Result<ExamVersionDetailResponse, ExamVersionError>> CreateAsync(
        Guid examId,
        CreateExamVersionRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return Failure(ExamVersionError.InvalidRequest);
        }

        if (!_currentUser.UserId.HasValue)
        {
            return Failure(ExamVersionError.CurrentUserUnavailable);
        }

        if (request.SourceVersionId.HasValue && (request.Sections?.Count ?? 0) > 0)
        {
            return Failure(ExamVersionError.InvalidNestedContent,
                new[] { new NestedContentValidationError("sections", "source_and_sections_mutually_exclusive", "SourceVersionId and non-empty Sections cannot be supplied together.") });
        }

        if (!request.SourceVersionId.HasValue)
        {
            var validation = _contentFactory.Create(Guid.Empty, request.Sections);
            if (!validation.IsSuccess)
                return Failure(ExamVersionError.InvalidNestedContent, validation.Error);
        }

        return await ExecuteDetailTransactionAsync(async transactionToken =>
        {
            var exam = await _versions.GetExamForUpdateAsync(examId, transactionToken);

            if (exam is null)
            {
                return Failure(ExamVersionError.ExamNotFound);
            }

            if (exam.IsArchived)
            {
                return Failure(ExamVersionError.ExamArchived);
            }

            ExamVersionData? source = null;

            if (request.SourceVersionId.HasValue)
            {
                source = await _versions.GetSourceForCloneAsync(
                    examId,
                    request.SourceVersionId.Value,
                    transactionToken);

                if (source is null)
                {
                    return Failure(ExamVersionError.SourceVersionNotFound);
                }
            }

            var title = request.Detail?.Title ?? source?.Title ?? exam.Title;
            var description = request.Detail?.Description ?? source?.Description ?? exam.Description;
            var instructions = request.Detail?.Instructions ?? source?.Instructions ?? string.Empty;
            var duration = request.Detail?.DurationMinutes ?? source?.DurationMinutes;
            var detailError = ValidateDetails(title, description, instructions, duration);
            if (detailError != ExamVersionError.None)
            {
                return Failure(detailError);
            }

            int versionNumber;
            try
            {
                versionNumber = exam.AllocateNextVersionNumber();
            }
            catch (ExamVersionNumberExhaustedException)
            {
                return Failure(ExamVersionError.VersionNumberExhausted);
            }

            var version = new ExamVersion(
                examId,
                versionNumber,
                title,
                description,
                instructions,
                duration,
                _currentUser.UserId.Value);

            CreatedExamContentGraph? createdGraph = null;
            if (source is not null)
            {
                _versions.Add(version);
                var clonePlan = await _contentCloner.CloneAsync(
                    source.Id,
                    version.Id,
                    transactionToken);
                createdGraph = new CreatedExamContentGraph(
                    clonePlan.Sections.ToList(), clonePlan.Questions.ToList(), clonePlan.Options.ToList(),
                    clonePlan.AnswerKeys.ToList(), NestedExamContentFactory.ToResponses(clonePlan), clonePlan.TotalScore);
            }
            else
            {
                var graphResult = _contentFactory.Create(version.Id, request.Sections);
                if (!graphResult.IsSuccess)
                {
                    return Failure(ExamVersionError.InvalidNestedContent, graphResult.Error);
                }

                var graph = graphResult.Value!;
                createdGraph = graph;
                _versions.Add(version);
                if (graph.Sections.Count > 0)
                {
                    if (_contentPersistence is null)
                        throw new InvalidOperationException("Nested exam content persistence is unavailable.");
                    _contentPersistence.Add(graph);
                    version.InitializeTotalScore(graph.TotalScore);
                }
            }

            await _unitOfWork.SaveChangesAsync(transactionToken);
            return Success(ToDetailResponse(version) with { Sections = createdGraph?.SectionResponses });
        }, cancellationToken);
    }

    public async Task<Result<ExamVersionDetailResponse, ExamVersionError>> UpdateAsync(
        Guid examId,
        Guid versionId,
        UpdateExamVersionRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return Failure(ExamVersionError.InvalidRequest);
        }

        return await ExecuteDetailTransactionAsync(async transactionToken =>
        {
            var exam = await _versions.GetExamForUpdateAsync(examId, transactionToken);

            if (exam is null)
            {
                return Failure(ExamVersionError.ExamNotFound);
            }

            if (exam.IsArchived)
            {
                return Failure(ExamVersionError.ExamArchived);
            }

            var version = await _versions.GetTrackedAsync(examId, versionId, transactionToken);

            if (version is null)
            {
                return Failure(ExamVersionError.VersionNotFound);
            }

            if (version.Status != ExamVersionStatus.Draft)
            {
                return Failure(ExamVersionError.VersionNotEditable);
            }

            var title = request.Title ?? version.Title;
            var description = request.Description ?? version.Description;
            var instructions = request.Instructions ?? version.Instructions;
            var durationMinutes = request.DurationMinutes ?? version.DurationMinutes;
            var validationError = ValidateDetails(title, description, instructions, durationMinutes);

            if (validationError != ExamVersionError.None)
            {
                return Failure(validationError);
            }

            if (version.UpdateDetails(title, description, instructions, durationMinutes))
            {
                await _unitOfWork.SaveChangesAsync(transactionToken);
            }

            return Success(ToDetailResponse(version));
        }, cancellationToken);
    }

    public async Task<Result<ExamVersionDetailResponse, ExamVersionError>> PublishAsync(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken = default)
    {
        return await ExecuteDetailTransactionAsync(async transactionToken =>
        {
            var exam = await _versions.GetExamForUpdateAsync(examId, transactionToken);

            if (exam is null)
            {
                return Failure(ExamVersionError.ExamNotFound);
            }

            if (exam.IsArchived)
            {
                return Failure(ExamVersionError.ExamArchived);
            }

            var target = await _versions.GetTrackedAsync(examId, versionId, transactionToken);

            if (target is null)
            {
                return Failure(ExamVersionError.VersionNotFound);
            }

            if (target.Status == ExamVersionStatus.Published)
            {
                return Success(ToDetailResponse(target));
            }

            if (target.Status is not (ExamVersionStatus.Draft or ExamVersionStatus.Retired))
            {
                return Failure(ExamVersionError.InvalidStatusTransition);
            }

            if (!await _readinessChecker.IsReadyAsync(target.Id, transactionToken))
            {
                return Failure(ExamVersionError.VersionNotReadyForPublication);
            }

            var now = DateTimeOffset.UtcNow;
            var currentPublished = await _versions.GetTrackedCurrentPublishedAsync(
                examId,
                target.Id,
                transactionToken);
            currentPublished?.Retire(now);
            target.Publish(now);
            await _unitOfWork.SaveChangesAsync(transactionToken);
            return Success(ToDetailResponse(target));
        }, cancellationToken);
    }

    public async Task<Result<ExamVersionDetailResponse, ExamVersionError>> RetireAsync(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken = default)
    {
        return await ExecuteDetailTransactionAsync(async transactionToken =>
        {
            var exam = await _versions.GetExamForUpdateAsync(examId, transactionToken);

            if (exam is null)
            {
                return Failure(ExamVersionError.ExamNotFound);
            }

            if (exam.IsArchived)
            {
                return Failure(ExamVersionError.ExamArchived);
            }

            var version = await _versions.GetTrackedAsync(examId, versionId, transactionToken);

            if (version is null)
            {
                return Failure(ExamVersionError.VersionNotFound);
            }

            if (version.Status == ExamVersionStatus.Retired)
            {
                return Success(ToDetailResponse(version));
            }

            if (version.Status != ExamVersionStatus.Published)
            {
                return Failure(ExamVersionError.InvalidStatusTransition);
            }

            version.Retire(DateTimeOffset.UtcNow);
            await _unitOfWork.SaveChangesAsync(transactionToken);
            return Success(ToDetailResponse(version));
        }, cancellationToken);
    }

    public async Task<ExamVersionError> DeleteAsync(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await _unitOfWork.ExecuteInTransactionAsync(async transactionToken =>
            {
                var exam = await _versions.GetExamForUpdateAsync(examId, transactionToken);

                if (exam is null)
                {
                    return ExamVersionError.ExamNotFound;
                }

                if (exam.IsArchived)
                {
                    return ExamVersionError.ExamArchived;
                }

                var version = await _versions.GetTrackedAsync(examId, versionId, transactionToken);

                if (version is null)
                {
                    return ExamVersionError.VersionNotFound;
                }

                if (version.Status != ExamVersionStatus.Draft)
                {
                    return ExamVersionError.VersionCannotBeDeleted;
                }

                _versions.Remove(version);
                await _unitOfWork.SaveChangesAsync(transactionToken);
                return ExamVersionError.None;
            }, cancellationToken);
        }
        catch (PersistenceConflictException)
        {
            return ExamVersionError.ConcurrencyConflict;
        }
    }

    private async Task<Result<ExamVersionDetailResponse, ExamVersionError>> ExecuteDetailTransactionAsync(
        Func<CancellationToken, Task<Result<ExamVersionDetailResponse, ExamVersionError>>> operation,
        CancellationToken cancellationToken)
    {
        try
        {
            return await _unitOfWork.ExecuteInTransactionAsync(operation, cancellationToken);
        }
        catch (PersistenceConflictException)
        {
            return Failure(ExamVersionError.ConcurrencyConflict);
        }
    }

    private static ExamVersionError ValidateDetails(
        string? title,
        string? description,
        string? instructions,
        int? durationMinutes)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return ExamVersionError.InvalidTitle;
        }

        var normalizedTitle = TextNormalizer.NormalizeName(title);

        if (normalizedTitle.Length > ExamVersionConstraints.TitleMaxLength)
        {
            return ExamVersionError.InvalidTitle;
        }

        if (description?.Trim().Length > ExamVersionConstraints.DescriptionMaxLength)
        {
            return ExamVersionError.InvalidDescription;
        }

        if (instructions?.Trim().Length > ExamVersionConstraints.InstructionsMaxLength)
        {
            return ExamVersionError.InvalidInstructions;
        }

        if (durationMinutes is <= 0 or > ExamVersionConstraints.MaxDurationMinutes)
        {
            return ExamVersionError.InvalidDuration;
        }

        return ExamVersionError.None;
    }

    private static ExamVersionSummaryResponse ToSummaryResponse(ExamVersionData version)
    {
        return new ExamVersionSummaryResponse(
            version.Id,
            version.ExamId,
            version.VersionNumber,
            version.Status,
            version.Title,
            version.DurationMinutes,
            version.TotalScore,
            version.CreatedByUserId,
            version.PublishedAtUtc,
            version.RetiredAtUtc,
            version.CreatedAtUtc,
            version.UpdatedAtUtc);
    }

    private static ExamVersionDetailResponse ToDetailResponse(ExamVersionData version)
    {
        return new ExamVersionDetailResponse(
            version.Id,
            version.ExamId,
            version.VersionNumber,
            version.Status,
            version.Title,
            version.Description,
            version.Instructions,
            version.DurationMinutes,
            version.TotalScore,
            version.CreatedByUserId,
            version.PublishedAtUtc,
            version.RetiredAtUtc,
            version.CreatedAtUtc,
            version.UpdatedAtUtc);
    }

    private static ExamVersionDetailResponse ToDetailResponse(ExamVersion version)
    {
        return new ExamVersionDetailResponse(
            version.Id,
            version.ExamId,
            version.VersionNumber,
            version.Status,
            version.Title,
            version.Description,
            version.Instructions,
            version.DurationMinutes,
            version.TotalScore,
            version.CreatedByUserId,
            version.PublishedAtUtc,
            version.RetiredAtUtc,
            version.CreatedAtUtc,
            version.UpdatedAtUtc);
    }

    private static Result<ExamVersionDetailResponse, ExamVersionError> Success(
        ExamVersionDetailResponse response)
    {
        return Result<ExamVersionDetailResponse, ExamVersionError>.Success(response);
    }

    private static Result<ExamVersionDetailResponse, ExamVersionError> Failure(
        ExamVersionError error)
    {
        return Result<ExamVersionDetailResponse, ExamVersionError>.Failure(error);
    }

    private static Result<ExamVersionDetailResponse, ExamVersionError> Failure(
        ExamVersionError error,
        object? additionalData) =>
        Result<ExamVersionDetailResponse, ExamVersionError>.Failure(error, additionalData);
}