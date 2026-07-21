using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.ExamClassifications.Abstractions;
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

public sealed class AdminExamService
{
    private readonly IAdminExamRepository _exams;
    private readonly IAdminExamTagRepository _examTags;
    private readonly IAdminExamSlugGenerator _slugGenerator;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserContext? _currentUser;
    private readonly IAdminExamVersionRepository? _versions;
    private readonly NestedExamContentFactory _contentFactory;
    private readonly NestedExamContentPersistence? _contentPersistence;

    public AdminExamService(
        IAdminExamRepository exams,
        IAdminExamTagRepository examTags,
        IAdminExamSlugGenerator slugGenerator,
        IUnitOfWork unitOfWork,
        ICurrentUserContext? currentUser = null,
        IAdminExamVersionRepository? versions = null,
        NestedExamContentFactory? contentFactory = null,
        NestedExamContentPersistence? contentPersistence = null)
    {
        _exams = exams;
        _examTags = examTags;
        _slugGenerator = slugGenerator;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _versions = versions;
        _contentFactory = contentFactory ?? new NestedExamContentFactory();
        _contentPersistence = contentPersistence;
    }

    public async Task<Result<CollectionResponse<ExamResponse>, ExamError>> GetAdminPageAsync(
        GetExamsRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request is null ||
            request.Page < 1 ||
            request.PageSize is < 1 or > ExamConstraints.MaxPageSize ||
            !Enum.IsDefined(request.Archive) ||
            !Enum.IsDefined(request.Sort) ||
            (request.Type.HasValue && !Enum.IsDefined(request.Type.Value)))
        {
            return Result<CollectionResponse<ExamResponse>, ExamError>.Failure(
                ExamError.InvalidPagination);
        }

        var skip = ((long)request.Page - 1) * request.PageSize;

        if (skip > int.MaxValue)
        {
            return Result<CollectionResponse<ExamResponse>, ExamError>.Failure(
                ExamError.InvalidPagination);
        }

        string? search = null;

        if (request.Search is not null)
        {
            search = request.Search.Trim();

            if (search.Length > ExamConstraints.SearchMaxLength)
            {
                return Result<CollectionResponse<ExamResponse>, ExamError>.Failure(
                    ExamError.InvalidRequest);
            }

            if (search.Length == 0)
            {
                search = null;
            }
            else
            {
                search = TextNormalizer.NormalizeName(search);
            }
        }

        var tagIds = request.TagIds?.Distinct().ToList() ?? [];
        var page = await _exams.GetPageAsync(
            new ExamPageQuery(
                (int)skip,
                request.PageSize,
                search,
                tagIds,
                request.Type,
                request.Archive,
                request.Sort),
            cancellationToken);

        var totalPages = page.TotalItems == 0
            ? 0
            : (int)(((long)page.TotalItems + request.PageSize - 1) / request.PageSize);
        var response = new CollectionResponse<ExamResponse>(
            page.Items.Select(ToResponse).ToList(),
            new CollectionMeta(
                request.Page,
                request.PageSize,
                page.TotalItems,
                totalPages,
                request.Page > 1,
                request.Page < totalPages));

        return Result<CollectionResponse<ExamResponse>, ExamError>.Success(response);
    }

    public async Task<Result<ExamResponse, ExamError>> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var exam = await _exams.GetByIdAsync(id, cancellationToken);

        return exam is null
            ? Result<ExamResponse, ExamError>.Failure(ExamError.NotFound)
            : Result<ExamResponse, ExamError>.Success(ToResponse(exam));
    }

    public async Task<Result<ExamResponse, ExamError>> CreateAsync(
        CreateExamRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.ExamDetail is null || request.TagIds is null)
        {
            return Result<ExamResponse, ExamError>.Failure(ExamError.InvalidRequest);
        }

        if (request.InitialVersion is not null && _currentUser?.UserId is null)
        {
            return Result<ExamResponse, ExamError>.Failure(ExamError.CurrentUserUnavailable);
        }

        if (request.InitialVersion?.SourceVersionId is not null)
        {
            return Result<ExamResponse, ExamError>.Failure(
                ExamError.InvalidNestedContent,
                new[] { new NestedContentValidationError("initialVersion.sourceVersionId", "invalid_source_version", "An initial version cannot clone content from another exam.") });
        }

        var detailError = ValidateDetails(request.ExamDetail.Title, request.ExamDetail.Description, request.ExamDetail.Type);

        if (detailError != ExamError.None)
        {
            return Result<ExamResponse, ExamError>.Failure(detailError);
        }

        var tagValidation = await ValidateTagIdsAsync(request.TagIds, cancellationToken);

        if (!tagValidation.IsSuccess)
        {
            return Result<ExamResponse, ExamError>.Failure(
                tagValidation.Error,
                tagValidation.AdditionalData);
        }

        if (tagValidation.Value!.Count > ExamConstraints.MaxTags)
        {
            return Result<ExamResponse, ExamError>.Failure(ExamError.TooManyTags);
        }

        var slug = await GenerateUniqueSlugAsync(
            request.ExamDetail.Title,
            excludedExamId: null,
            cancellationToken);

        if (slug is null)
        {
            return Result<ExamResponse, ExamError>.Failure(
                ExamError.UnableToGenerateUniqueSlug);
        }

        try
        {
            var creation = await _unitOfWork.ExecuteInTransactionAsync(async token =>
            {
                var exam = new Exam(request.ExamDetail.Title, slug, request.ExamDetail.Description, request.ExamDetail.Type);
                exam.AddTags(tagValidation.Value);
                ExamVersionDetailResponse? initialVersionResponse = null;
                ExamVersion? initialVersion = null;
                CreatedExamContentGraph? graph = null;

                if (request.InitialVersion is not null)
                {
                    var detail = request.InitialVersion.Detail;
                    var title = detail?.Title ?? exam.Title;
                    var description = detail?.Description ?? exam.Description;
                    var instructions = detail?.Instructions ?? string.Empty;
                    var duration = detail?.DurationMinutes;
                    var versionError = ValidateVersionDetails(title, description, instructions, duration);
                    if (versionError is not null)
                        return Result<(Exam Exam, ExamVersionDetailResponse? Version), ExamError>.Failure(
                            ExamError.InvalidNestedContent, new[] { versionError });

                    initialVersion = new ExamVersion(exam.Id, exam.AllocateNextVersionNumber(), title,
                        description, instructions, duration, _currentUser!.UserId!.Value);
                    var graphResult = _contentFactory.Create(initialVersion.Id,
                        request.InitialVersion.Sections, "initialVersion.sections");
                    if (!graphResult.IsSuccess)
                        return Result<(Exam Exam, ExamVersionDetailResponse? Version), ExamError>.Failure(
                            ExamError.InvalidNestedContent, graphResult.Error);
                    graph = graphResult.Value!;
                    if (graph.Sections.Count > 0)
                        initialVersion.InitializeTotalScore(graph.TotalScore);
                    initialVersionResponse = ToVersionResponse(initialVersion, graph.SectionResponses);
                }

                _exams.Add(exam);
                if (initialVersion is not null)
                {
                    if (_versions is null)
                        throw new InvalidOperationException("Exam version persistence is unavailable.");
                    _versions.Add(initialVersion);
                    if (graph!.Sections.Count > 0)
                    {
                        if (_contentPersistence is null)
                            throw new InvalidOperationException("Nested exam content persistence is unavailable.");
                        _contentPersistence.Add(graph);
                    }
                }

                await _unitOfWork.SaveChangesAsync(token);
                return Result<(Exam Exam, ExamVersionDetailResponse? Version), ExamError>.Success((exam, initialVersionResponse));
            }, cancellationToken);

            if (!creation.IsSuccess)
                return Result<ExamResponse, ExamError>.Failure(creation.Error, creation.AdditionalData);
            var saved = await GetSavedResponseAsync(creation.Value.Exam, cancellationToken);
            return saved.IsSuccess
                ? Result<ExamResponse, ExamError>.Success(saved.Value! with { InitialVersion = creation.Value.Version })
                : saved;
        }
        catch (PersistenceConflictException)
        {
            return Result<ExamResponse, ExamError>.Failure(ExamError.ConcurrencyConflict);
        }
    }

    public async Task<Result<ExamResponse, ExamError>> UpdateAsync(
        Guid id,
        IReadOnlyList<PatchOperation>? operations,
        CancellationToken cancellationToken = default)
    {
        var limitErrors = RestrictedPatchApplier.ValidateDocumentLimits(operations);
        if (limitErrors is not null)
            return Result<ExamResponse, ExamError>.Failure(ExamError.InvalidPatch, limitErrors);

        var exam = await _exams.GetTrackedWithTagMappingsAsync(id, cancellationToken);

        if (exam is null)
        {
            return Result<ExamResponse, ExamError>.Failure(ExamError.NotFound);
        }

        var patch = RestrictedPatchApplier.Apply(operations, new ExamPatchModel
        {
            Title = exam.Title,
            Description = exam.Description,
            Type = exam.Type
        });
        if (!patch.IsSuccess)
            return Result<ExamResponse, ExamError>.Failure(ExamError.InvalidPatch, patch.Error);

        var model = patch.Value!;
        var detailError = ValidateDetails(model.Title, model.Description, model.Type);

        if (detailError != ExamError.None)
            return InvalidPatch(operations!.Count, "invalid_final_state", "The patched exam details are invalid.");

        var normalizedTitle = TextNormalizer.NormalizeName(model.Title);
        var slug = exam.Slug;

        if (!string.Equals(normalizedTitle, exam.Title, StringComparison.Ordinal))
        {
            slug = await GenerateUniqueSlugAsync(normalizedTitle, id, cancellationToken);

            if (slug is null)
            {
                return Result<ExamResponse, ExamError>.Failure(
                    ExamError.UnableToGenerateUniqueSlug);
            }

            // Published public exams may need slug history or redirects in a later feature.
        }

        var changed = exam.Title != normalizedTitle || exam.Slug != slug ||
            exam.Description != (model.Description?.Trim() ?? string.Empty) || exam.Type != model.Type;
        exam.UpdateDetails(normalizedTitle, slug, model.Description, model.Type);
        if (changed)
            await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetSavedResponseAsync(exam, cancellationToken);
    }

    public async Task<Result<ExamResponse, ExamError>> ReplaceTagsAsync(
        Guid id,
        ReplaceExamTagsRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request?.TagIds is null)
            return Result<ExamResponse, ExamError>.Failure(ExamError.InvalidRequest);
        if (HasDuplicates(request.TagIds))
            return Result<ExamResponse, ExamError>.Failure(ExamError.DuplicateTagIds);
        if (request.TagIds.Count > ExamConstraints.MaxTags)
            return Result<ExamResponse, ExamError>.Failure(ExamError.TooManyTags);

        var exam = await _exams.GetTrackedWithTagMappingsAsync(id, cancellationToken);
        if (exam is null)
            return Result<ExamResponse, ExamError>.Failure(ExamError.NotFound);

        var validation = await ValidateActiveTagIdsAsync(request.TagIds, cancellationToken);
        if (!validation.IsSuccess)
            return Result<ExamResponse, ExamError>.Failure(validation.Error, validation.AdditionalData);

        var requested = validation.Value!.ToHashSet();
        var current = exam.ExamTagMappings.Select(mapping => mapping.ExamTagId).ToHashSet();
        if (!current.SetEquals(requested))
        {
            exam.RemoveTags(current.Except(requested));
            exam.AddTags(requested.Except(current));
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return await GetSavedResponseAsync(exam, cancellationToken);
    }

    public async Task<ExamError> ArchiveAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var exam = await _exams.GetTrackedWithTagMappingsAsync(id, cancellationToken);

        if (exam is null)
        {
            return ExamError.NotFound;
        }

        exam.Archive();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ExamError.None;
    }

    public async Task<ExamError> RestoreAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var exam = await _exams.GetTrackedWithTagMappingsAsync(id, cancellationToken);

        if (exam is null)
        {
            return ExamError.NotFound;
        }

        exam.Restore();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ExamError.None;
    }

    private async Task<Result<IReadOnlyCollection<Guid>, ExamError>> ValidateTagIdsAsync(
        IReadOnlyCollection<Guid> tagIds,
        CancellationToken cancellationToken)
    {
        if (HasDuplicates(tagIds))
        {
            return Result<IReadOnlyCollection<Guid>, ExamError>.Failure(
                ExamError.DuplicateTagIds);
        }

        return await ValidateActiveTagIdsAsync(tagIds, cancellationToken);
    }

    private async Task<Result<IReadOnlyCollection<Guid>, ExamError>> ValidateActiveTagIdsAsync(
        IReadOnlyCollection<Guid> tagIds,
        CancellationToken cancellationToken)
    {
        if (tagIds.Count == 0)
        {
            return Result<IReadOnlyCollection<Guid>, ExamError>.Success([]);
        }

        var existingTagIds = await _examTags.GetExistingActiveTagIdsAsync(
            tagIds,
            cancellationToken);
        var missingOrArchivedTagIds = tagIds
            .Except(existingTagIds)
            .Order()
            .ToList();

        return missingOrArchivedTagIds.Count == 0
            ? Result<IReadOnlyCollection<Guid>, ExamError>.Success(tagIds.ToList())
            : Result<IReadOnlyCollection<Guid>, ExamError>.Failure(
                ExamError.MissingOrArchivedTagIds,
                missingOrArchivedTagIds);
    }

    private async Task<string?> GenerateUniqueSlugAsync(
        string title,
        Guid? excludedExamId,
        CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < ExamConstraints.SlugGenerationMaxAttempts; attempt++)
        {
            var candidate = _slugGenerator.Generate(title);

            if (!await _exams.ExistsBySlugAsync(candidate, excludedExamId, cancellationToken))
            {
                return candidate;
            }
        }

        return null;
    }

    private async Task<Result<ExamResponse, ExamError>> GetSavedResponseAsync(
        Exam exam,
        CancellationToken cancellationToken)
    {
        var savedExam = await _exams.GetByIdAsync(exam.Id, cancellationToken);

        return savedExam is null
            ? Result<ExamResponse, ExamError>.Failure(ExamError.NotFound)
            : Result<ExamResponse, ExamError>.Success(ToResponse(savedExam));
    }

    private static ExamError ValidateDetails(string? title, string? description, ExamType type)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return ExamError.InvalidTitle;
        }

        var normalizedTitle = TextNormalizer.NormalizeName(title);

        if (normalizedTitle.Length > ExamConstraints.TitleMaxLength)
        {
            return ExamError.InvalidTitle;
        }

        if (description?.Trim().Length > ExamConstraints.DescriptionMaxLength)
        {
            return ExamError.InvalidDescription;
        }

        return Enum.IsDefined(type) ? ExamError.None : ExamError.InvalidType;
    }

    private static NestedContentValidationError? ValidateVersionDetails(
        string? title, string? description, string? instructions, int? duration)
    {
        if (string.IsNullOrWhiteSpace(title) || TextNormalizer.NormalizeName(title).Length > ExamVersionConstraints.TitleMaxLength)
            return new("initialVersion.detail.title", "invalid_title", "Exam version title is invalid.");
        if (description?.Trim().Length > ExamVersionConstraints.DescriptionMaxLength)
            return new("initialVersion.detail.description", "invalid_description", "Exam version description is invalid.");
        if (instructions?.Trim().Length > ExamVersionConstraints.InstructionsMaxLength)
            return new("initialVersion.detail.instructions", "invalid_instructions", "Exam version instructions are invalid.");
        if (duration is <= 0 or > ExamVersionConstraints.MaxDurationMinutes)
            return new("initialVersion.detail.durationMinutes", "invalid_duration", "Exam version duration is invalid.");
        return null;
    }

    private static ExamVersionDetailResponse ToVersionResponse(
        ExamVersion version, IReadOnlyList<ExamSectionDetailResponse> sections) =>
        new(version.Id, version.ExamId, version.VersionNumber, version.Status, version.Title,
            version.Description, version.Instructions, version.DurationMinutes, version.TotalScore,
            version.ContentRevision, version.CreatedByUserId, version.PublishedAtUtc, version.RetiredAtUtc, version.CreatedAtUtc,
            version.UpdatedAtUtc, sections);

    private static Result<ExamResponse, ExamError> InvalidPatch(int operationIndex, string code, string message) =>
        Result<ExamResponse, ExamError>.Failure(
            ExamError.InvalidPatch,
            new[] { new PatchValidationError(operationIndex, null, code, message) });

    private static bool HasDuplicates(IReadOnlyCollection<Guid> ids)
    {
        return ids.Distinct().Count() != ids.Count;
    }

    private static ExamResponse ToResponse(ExamData exam)
    {
        return new ExamResponse(
            exam.Id,
            exam.Title,
            exam.Slug,
            exam.Description,
            exam.Type,
            exam.Tags
                .OrderBy(tag => tag.Type)
                .ThenBy(tag => tag.Name)
                .Select(tag => new ExamTagSummaryResponse(
                    tag.Id,
                    tag.Name,
                    tag.Slug,
                    tag.Type,
                    tag.IsArchived))
                .ToList(),
            exam.IsArchived,
            exam.CreatedAtUtc,
            exam.UpdatedAtUtc);
    }
}