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

    public AdminExamService(
        IAdminExamRepository exams,
        IAdminExamTagRepository examTags,
        IAdminExamSlugGenerator slugGenerator,
        IUnitOfWork unitOfWork)
    {
        _exams = exams;
        _examTags = examTags;
        _slugGenerator = slugGenerator;
        _unitOfWork = unitOfWork;
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

        var exam = new Exam(
            request.ExamDetail.Title,
            slug,
            request.ExamDetail.Description,
            request.ExamDetail.Type);
        exam.AddTags(tagValidation.Value);

        _exams.Add(exam);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetSavedResponseAsync(exam, cancellationToken);
    }

    public async Task<Result<ExamResponse, ExamError>> UpdateAsync(
        Guid id,
        UpdateExamRequest request,
        CancellationToken cancellationToken = default)
    {
        if (HasDuplicates(request.AddedTagIds) || HasDuplicates(request.RemovedTagIds))
        {
            return Result<ExamResponse, ExamError>.Failure(ExamError.DuplicateTagIds);
        }

        var addedTagIds = request.AddedTagIds.ToHashSet();
        var removedTagIds = request.RemovedTagIds.ToHashSet();

        if (addedTagIds.Overlaps(removedTagIds))
        {
            return Result<ExamResponse, ExamError>.Failure(ExamError.OverlappingTagChanges);
        }

        var exam = await _exams.GetTrackedWithTagMappingsAsync(id, cancellationToken);

        if (exam is null)
        {
            return Result<ExamResponse, ExamError>.Failure(ExamError.NotFound);
        }

        var title = request.ExamDetail?.Title ?? exam.Title;
        var description = request.ExamDetail?.Description ?? exam.Description;
        var type = request.ExamDetail?.Type ?? exam.Type;
        var detailError = ValidateDetails(title, description, type);

        if (detailError != ExamError.None)
        {
            return Result<ExamResponse, ExamError>.Failure(detailError);
        }

        var addedTagValidation = await ValidateActiveTagIdsAsync(addedTagIds, cancellationToken);

        if (!addedTagValidation.IsSuccess)
        {
            return Result<ExamResponse, ExamError>.Failure(
                addedTagValidation.Error,
                addedTagValidation.AdditionalData);
        }

        var finalTagIds = exam.ExamTagMappings
            .Select(mapping => mapping.ExamTagId)
            .ToHashSet();
        finalTagIds.UnionWith(addedTagIds);
        finalTagIds.ExceptWith(removedTagIds);

        if (finalTagIds.Count > ExamConstraints.MaxTags)
        {
            return Result<ExamResponse, ExamError>.Failure(ExamError.TooManyTags);
        }

        var normalizedTitle = TextNormalizer.NormalizeName(title);
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

        exam.UpdateDetails(
            normalizedTitle,
            slug,
            description,
            type);
        exam.AddTags(addedTagIds);
        exam.RemoveTags(removedTagIds);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

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