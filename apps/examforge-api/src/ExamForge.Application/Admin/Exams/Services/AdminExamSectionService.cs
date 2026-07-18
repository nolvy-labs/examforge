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

public sealed class AdminExamSectionService
{
    private readonly IAdminExamSectionRepository _sections;
    private readonly IAdminExamVersionRepository _versions;
    private readonly IUnitOfWork _unitOfWork;
    private readonly NestedExamContentFactory _contentFactory;
    private readonly NestedExamContentPersistence? _contentPersistence;

    public AdminExamSectionService(
        IAdminExamSectionRepository sections,
        IAdminExamVersionRepository versions,
        IUnitOfWork unitOfWork,
        NestedExamContentFactory? contentFactory = null,
        NestedExamContentPersistence? contentPersistence = null)
    {
        _sections = sections;
        _versions = versions;
        _unitOfWork = unitOfWork;
        _contentFactory = contentFactory ?? new NestedExamContentFactory();
        _contentPersistence = contentPersistence;
    }

    public async Task<Result<IReadOnlyList<ExamSectionSummaryResponse>, ExamSectionError>> GetListAsync(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken = default)
    {
        var ownershipError = await ValidateReadOwnershipAsync(examId, versionId, cancellationToken);

        if (ownershipError != ExamSectionError.None)
        {
            return Result<IReadOnlyList<ExamSectionSummaryResponse>, ExamSectionError>.Failure(
                ownershipError);
        }

        var sections = await _sections.GetListAsync(examId, versionId, cancellationToken);
        return Result<IReadOnlyList<ExamSectionSummaryResponse>, ExamSectionError>.Success(
            sections.Select(ToSummaryResponse).ToList());
    }

    public async Task<Result<ExamSectionDetailResponse, ExamSectionError>> GetByIdAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        CancellationToken cancellationToken = default)
    {
        var ownershipError = await ValidateReadOwnershipAsync(examId, versionId, cancellationToken);

        if (ownershipError != ExamSectionError.None)
        {
            return DetailFailure(ownershipError);
        }

        var section = await _sections.GetDetailAsync(
            examId,
            versionId,
            sectionId,
            cancellationToken);
        return section is null
            ? DetailFailure(ExamSectionError.SectionNotFound)
            : DetailSuccess(ToDetailResponse(section));
    }

    public async Task<Result<ExamSectionDetailResponse, ExamSectionError>> CreateAsync(
        Guid examId,
        Guid versionId,
        CreateExamSectionRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request?.Detail is null)
        {
            return DetailFailure(ExamSectionError.InvalidRequest);
        }

        var validationError = ValidateDetails(
            request.Detail.Kind,
            request.Detail.Title,
            request.Detail.Instructions,
            request.Detail.StimulusText,
            request.Detail.MediaUrl);

        if (validationError != ExamSectionError.None)
        {
            return DetailFailure(validationError);
        }

        return await ExecuteMutationAsync(async transactionToken =>
        {
            var mutation = await LoadMutableVersionAsync(examId, versionId, transactionToken);

            if (mutation.Error != ExamSectionError.None)
            {
                return DetailFailure(mutation.Error);
            }

            var maximumOrder = await _sections.GetMaximumDisplayOrderAsync(
                versionId,
                transactionToken);

            if (maximumOrder == int.MaxValue)
            {
                return DetailFailure(ExamSectionError.DisplayOrderExhausted);
            }

            var graphResult = _contentFactory.Create(
                versionId,
                [new CreateExamSectionInput(request.Detail, request.Questions)]);
            if (!graphResult.IsSuccess)
            {
                return Result<ExamSectionDetailResponse, ExamSectionError>.Failure(
                    ExamSectionError.InvalidNestedContent,
                    graphResult.Error.Select(error => error with
                    {
                        Path = error.Path.StartsWith("sections[0].", StringComparison.Ordinal)
                            ? error.Path[12..]
                            : error.Path
                    }).ToList());
            }

            var graph = graphResult.Value!;
            var section = graph.Sections[0];
            section.ChangeDisplayOrder(maximumOrder.HasValue ? maximumOrder.Value + 1 : 0);
            if (graph.Questions.Count > 0)
            {
                if (_contentPersistence is null)
                    throw new InvalidOperationException("Nested exam content persistence is unavailable.");
                _contentPersistence.Add(graph);
                mutation.Version!.UpdateTotalScore(mutation.Version.TotalScore + graph.TotalScore);
            }
            else
            {
                _sections.Add(section);
            }
            await _unitOfWork.SaveChangesAsync(transactionToken);
            return DetailSuccess(NestedExamContentFactory.ToResponse(
                section,
                graph.SectionResponses[0].Questions ?? []));
        }, DetailFailure(ExamSectionError.ConcurrencyConflict), cancellationToken);
    }

    public async Task<Result<ExamSectionDetailResponse, ExamSectionError>> UpdateAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        UpdateExamSectionRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return DetailFailure(ExamSectionError.InvalidRequest);
        }

        if ((request.ClearStimulusText && request.Detail?.StimulusText is not null) ||
            (request.ClearMediaUrl && request.Detail?.MediaUrl is not null))
        {
            return DetailFailure(ExamSectionError.ConflictingPatchOperations);
        }

        return await ExecuteMutationAsync(async transactionToken =>
        {
            var mutation = await LoadMutableVersionAsync(examId, versionId, transactionToken);

            if (mutation.Error != ExamSectionError.None)
            {
                return DetailFailure(mutation.Error);
            }

            var section = await _sections.GetTrackedAsync(
                versionId,
                sectionId,
                transactionToken);

            if (section is null)
            {
                return DetailFailure(ExamSectionError.SectionNotFound);
            }

            var kind = request.Detail?.Kind ?? section.Kind;
            var title = request.Detail?.Title ?? section.Title;
            var instructions = request.Detail?.Instructions ?? section.Instructions;
            var stimulusText = request.ClearStimulusText
                ? null
                : request.Detail?.StimulusText ?? section.StimulusText;
            var mediaUrl = request.ClearMediaUrl
                ? null
                : request.Detail?.MediaUrl ?? section.MediaUrl;
            var validationError = ValidateDetails(
                kind,
                title,
                instructions,
                stimulusText,
                mediaUrl);

            if (validationError != ExamSectionError.None)
            {
                return DetailFailure(validationError);
            }

            if (section.UpdateDetails(kind, title, instructions, stimulusText, mediaUrl))
            {
                await _unitOfWork.SaveChangesAsync(transactionToken);
            }

            var saved = await _sections.GetDetailAsync(
                examId,
                versionId,
                section.Id,
                transactionToken);
            return DetailSuccess(saved is null
                ? ToDetailResponse(section, 0, 0m)
                : ToDetailResponse(saved));
        }, DetailFailure(ExamSectionError.ConcurrencyConflict), cancellationToken);
    }

    public async Task<Result<IReadOnlyList<ExamSectionSummaryResponse>, ExamSectionError>> ReorderAsync(
        Guid examId,
        Guid versionId,
        ReorderExamSectionsRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request?.OrderedSectionIds is null)
        {
            return SummaryFailure(ExamSectionError.InvalidRequest);
        }

        return await ExecuteMutationAsync(async transactionToken =>
        {
            var mutation = await LoadMutableVersionAsync(examId, versionId, transactionToken);

            if (mutation.Error != ExamSectionError.None)
            {
                return SummaryFailure(mutation.Error);
            }

            var current = await _sections.GetTrackedListAsync(versionId, transactionToken);
            var requestedIds = request.OrderedSectionIds;

            if (requestedIds.Distinct().Count() != requestedIds.Count ||
                requestedIds.Count != current.Count ||
                !requestedIds.ToHashSet().SetEquals(current.Select(section => section.Id)))
            {
                return SummaryFailure(ExamSectionError.InvalidSectionOrder);
            }

            if (current.Select(section => section.Id).SequenceEqual(requestedIds))
            {
                var unchanged = await _sections.GetListAsync(examId, versionId, transactionToken);
                return SummarySuccess(unchanged.Select(ToSummaryResponse).ToList());
            }

            AssignTemporaryOrders(current);
            await _unitOfWork.SaveChangesAsync(transactionToken);

            var sectionsById = current.ToDictionary(section => section.Id);

            for (var index = 0; index < requestedIds.Count; index++)
            {
                sectionsById[requestedIds[index]].ChangeDisplayOrder(index);
            }

            await _unitOfWork.SaveChangesAsync(transactionToken);
            var reordered = await _sections.GetListAsync(examId, versionId, transactionToken);
            return SummarySuccess(reordered.Select(ToSummaryResponse).ToList());
        }, SummaryFailure(ExamSectionError.ConcurrencyConflict), cancellationToken);
    }

    public async Task<ExamSectionError> DeleteAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        CancellationToken cancellationToken = default)
    {
        return await ExecuteMutationAsync(async transactionToken =>
        {
            var mutation = await LoadMutableVersionAsync(examId, versionId, transactionToken);

            if (mutation.Error != ExamSectionError.None)
            {
                return mutation.Error;
            }

            var current = await _sections.GetTrackedListAsync(versionId, transactionToken);
            var section = current.SingleOrDefault(item => item.Id == sectionId);

            if (section is null)
            {
                return ExamSectionError.SectionNotFound;
            }

            var remaining = current.Where(item => item.Id != sectionId).ToList();

            if (remaining.Count > 0)
            {
                AssignTemporaryOrders(remaining);
            }

            _sections.Remove(section);
            await _unitOfWork.SaveChangesAsync(transactionToken);

            for (var index = 0; index < remaining.Count; index++)
            {
                remaining[index].ChangeDisplayOrder(index);
            }

            if (remaining.Count > 0)
            {
                await _unitOfWork.SaveChangesAsync(transactionToken);
            }

            return ExamSectionError.None;
        }, ExamSectionError.ConcurrencyConflict, cancellationToken);
    }

    private async Task<ExamSectionError> ValidateReadOwnershipAsync(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken)
    {
        if (!await _versions.ExamExistsAsync(examId, cancellationToken))
        {
            return ExamSectionError.ExamNotFound;
        }

        return await _versions.GetDetailAsync(examId, versionId, cancellationToken) is null
            ? ExamSectionError.VersionNotFound
            : ExamSectionError.None;
    }

    private async Task<(ExamVersion? Version, ExamSectionError Error)> LoadMutableVersionAsync(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken)
    {
        var exam = await _versions.GetExamForUpdateAsync(examId, cancellationToken);

        if (exam is null)
        {
            return (null, ExamSectionError.ExamNotFound);
        }

        if (exam.IsArchived)
        {
            return (null, ExamSectionError.ExamArchived);
        }

        var version = await _versions.GetTrackedAsync(examId, versionId, cancellationToken);

        if (version is null)
        {
            return (null, ExamSectionError.VersionNotFound);
        }

        return version.Status == ExamVersionStatus.Draft
            ? (version, ExamSectionError.None)
            : (version, ExamSectionError.VersionNotEditable);
    }

    private async Task<T> ExecuteMutationAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        T conflictResult,
        CancellationToken cancellationToken)
    {
        try
        {
            return await _unitOfWork.ExecuteInTransactionAsync(operation, cancellationToken);
        }
        catch (PersistenceConflictException)
        {
            return conflictResult;
        }
    }

    private static void AssignTemporaryOrders(IReadOnlyList<ExamSection> sections)
    {
        for (var index = 0; index < sections.Count; index++)
        {
            sections[index].ChangeDisplayOrder(-1 - index);
        }
    }

    private static ExamSectionError ValidateDetails(
        ExamSectionKind kind,
        string? title,
        string? instructions,
        string? stimulusText,
        string? mediaUrl)
    {
        if (!Enum.IsDefined(kind))
        {
            return ExamSectionError.InvalidKind;
        }

        if (string.IsNullOrWhiteSpace(title))
        {
            return ExamSectionError.InvalidTitle;
        }

        var normalizedTitle = TextNormalizer.NormalizeName(title);

        if (normalizedTitle.Length > ExamSectionConstraints.TitleMaxLength)
        {
            return ExamSectionError.InvalidTitle;
        }

        if (instructions?.Trim().Length > ExamSectionConstraints.InstructionsMaxLength)
        {
            return ExamSectionError.InvalidInstructions;
        }

        if (stimulusText is not null &&
            (string.IsNullOrWhiteSpace(stimulusText) ||
             stimulusText.Trim().Length > ExamSectionConstraints.StimulusTextMaxLength))
        {
            return ExamSectionError.InvalidStimulusText;
        }

        if (mediaUrl is not null)
        {
            var normalizedMediaUrl = mediaUrl.Trim();

            if (normalizedMediaUrl.Length == 0 ||
                normalizedMediaUrl.Length > ExamSectionConstraints.MediaUrlMaxLength ||
                !Uri.TryCreate(normalizedMediaUrl, UriKind.Absolute, out var uri) ||
                (!uri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase) &&
                 !uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)))
            {
                return ExamSectionError.InvalidMediaUrl;
            }
        }

        return ExamSectionError.None;
    }

    private static ExamSectionSummaryResponse ToSummaryResponse(ExamSectionData section)
    {
        return new ExamSectionSummaryResponse(
            section.Id,
            section.ExamVersionId,
            section.Kind,
            section.Title,
            section.DisplayOrder,
            section.QuestionCount,
            section.TotalPoints,
            section.CreatedAtUtc,
            section.UpdatedAtUtc);
    }

    private static ExamSectionDetailResponse ToDetailResponse(ExamSectionData section)
    {
        return new ExamSectionDetailResponse(
            section.Id,
            section.ExamVersionId,
            section.Kind,
            section.Title,
            section.DisplayOrder,
            section.QuestionCount,
            section.TotalPoints,
            section.CreatedAtUtc,
            section.UpdatedAtUtc,
            section.Instructions,
            section.StimulusText,
            section.MediaUrl);
    }

    private static ExamSectionDetailResponse ToDetailResponse(
        ExamSection section,
        int questionCount,
        decimal totalPoints)
    {
        return new ExamSectionDetailResponse(
            section.Id,
            section.ExamVersionId,
            section.Kind,
            section.Title,
            section.DisplayOrder,
            questionCount,
            totalPoints,
            section.CreatedAtUtc,
            section.UpdatedAtUtc,
            section.Instructions,
            section.StimulusText,
            section.MediaUrl);
    }

    private static Result<ExamSectionDetailResponse, ExamSectionError> DetailSuccess(
        ExamSectionDetailResponse response) =>
        Result<ExamSectionDetailResponse, ExamSectionError>.Success(response);

    private static Result<ExamSectionDetailResponse, ExamSectionError> DetailFailure(
        ExamSectionError error) =>
        Result<ExamSectionDetailResponse, ExamSectionError>.Failure(error);

    private static Result<IReadOnlyList<ExamSectionSummaryResponse>, ExamSectionError> SummarySuccess(
        IReadOnlyList<ExamSectionSummaryResponse> response) =>
        Result<IReadOnlyList<ExamSectionSummaryResponse>, ExamSectionError>.Success(response);

    private static Result<IReadOnlyList<ExamSectionSummaryResponse>, ExamSectionError> SummaryFailure(
        ExamSectionError error) =>
        Result<IReadOnlyList<ExamSectionSummaryResponse>, ExamSectionError>.Failure(error);
}