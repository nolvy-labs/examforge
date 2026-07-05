using ExamForge.Application.Abstractions.ExamClassifications;
using ExamForge.Application.Abstractions.Persistence;
using ExamForge.Application.Common;
using ExamForge.Domain.Common;
using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.ExamClassifications;

public sealed class ExamCategoryService
{
    private readonly IExamCategoryRepository _examCategories;
    private readonly IUnitOfWork _unitOfWork;

    public ExamCategoryService(
        IExamCategoryRepository examCategories,
        IUnitOfWork unitOfWork)
    {
        _examCategories = examCategories;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyCollection<ExamCategoryResponse>> GetPublicListAsync(
        CancellationToken cancellationToken = default)
    {
        var categories = await _examCategories.GetPublicListAsync(cancellationToken);

        return categories.Select(ToResponse).ToList();
    }

    public async Task<ExamCategoryResponse?> GetPublicByIdOrSlugAsync(
        string idOrSlug,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idOrSlug))
        {
            return null;
        }

        var normalizedIdOrSlug = Guid.TryParse(idOrSlug, out _)
            ? idOrSlug
            : TextNormalizer.NormalizeSlug(idOrSlug);

        var category = await _examCategories.GetPublicByIdOrSlugAsync(
            normalizedIdOrSlug,
            cancellationToken);

        return category is null ? null : ToResponse(category);
    }

    public async Task<IReadOnlyCollection<ExamCategoryResponse>> GetAdminListAsync(
        bool? isArchived,
        CancellationToken cancellationToken = default)
    {
        var categories = await _examCategories.GetAdminListAsync(
            isArchived,
            cancellationToken);

        return categories.Select(ToResponse).ToList();
    }

    public async Task<Result<ExamCategoryResponse, ExamCategoryError>> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var category = await _examCategories.GetByIdWithTagsAsync(id, cancellationToken);

        if (category is null)
        {
            return Result<ExamCategoryResponse, ExamCategoryError>.Failure(
                ExamCategoryError.NotFound);
        }

        return Result<ExamCategoryResponse, ExamCategoryError>.Success(ToResponse(category));
    }

    public async Task<Result<ExamCategoryResponse, ExamCategoryError>> CreateAsync(
        CreateExamCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateCategoryValues(
            request.Name,
            request.Slug,
            request.Description,
            request.MatchMode);

        if (validationError != ExamCategoryError.None)
        {
            return Result<ExamCategoryResponse, ExamCategoryError>.Failure(validationError);
        }

        var tagIdsResult = await ValidateTagIdsAsync(
            request.ExamTagIds ?? [],
            cancellationToken);

        if (!tagIdsResult.IsSuccess)
        {
            return Result<ExamCategoryResponse, ExamCategoryError>.Failure(
                tagIdsResult.Error,
                tagIdsResult.AdditionalData);
        }

        var normalizedSlug = TextNormalizer.NormalizeSlug(
            string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug);

        if (await _examCategories.ExistsBySlugAsync(
                normalizedSlug,
                cancellationToken: cancellationToken))
        {
            return Result<ExamCategoryResponse, ExamCategoryError>.Failure(
                ExamCategoryError.SlugAlreadyExists);
        }

        var category = new ExamCategory(
            request.Name,
            normalizedSlug,
            request.Description,
            request.MatchMode,
            request.DisplayOrder);

        category.ReplaceTags(tagIdsResult.Value!);

        if (request.IsFeatured)
        {
            category.MarkAsFeatured();
        }

        _examCategories.Add(category);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var savedCategory = await _examCategories.GetByIdWithTagsAsync(
            category.Id,
            cancellationToken);

        return Result<ExamCategoryResponse, ExamCategoryError>.Success(
            ToResponse(savedCategory ?? category));
    }

    public async Task<Result<ExamCategoryResponse, ExamCategoryError>> UpdateAsync(
        Guid id,
        UpdateExamCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        var category = await _examCategories.GetByIdWithTagsAsync(id, cancellationToken);

        if (category is null)
        {
            return Result<ExamCategoryResponse, ExamCategoryError>.Failure(
                ExamCategoryError.NotFound);
        }

        var newName = request.Name ?? category.Name;
        var newSlug = request.Slug ?? category.Slug;
        var newDescription = request.Description ?? category.Description;
        var newMatchMode = request.MatchMode ?? category.MatchMode;
        var newDisplayOrder = request.DisplayOrder ?? category.DisplayOrder;

        var validationError = ValidateCategoryValues(
            newName,
            newSlug,
            newDescription,
            newMatchMode);

        if (validationError != ExamCategoryError.None)
        {
            return Result<ExamCategoryResponse, ExamCategoryError>.Failure(validationError);
        }

        IReadOnlyCollection<Guid>? tagIds = null;

        if (request.ExamTagIds is not null)
        {
            var tagIdsResult = await ValidateTagIdsAsync(
                request.ExamTagIds,
                cancellationToken);

            if (!tagIdsResult.IsSuccess)
            {
                return Result<ExamCategoryResponse, ExamCategoryError>.Failure(
                    tagIdsResult.Error,
                    tagIdsResult.AdditionalData);
            }

            tagIds = tagIdsResult.Value;
        }

        var normalizedSlug = TextNormalizer.NormalizeSlug(newSlug);

        if (await _examCategories.ExistsBySlugAsync(
                normalizedSlug,
                excludedCategoryId: id,
                cancellationToken))
        {
            return Result<ExamCategoryResponse, ExamCategoryError>.Failure(
                ExamCategoryError.SlugAlreadyExists);
        }

        category.UpdateDetails(
            newName,
            normalizedSlug,
            newDescription,
            newMatchMode,
            newDisplayOrder);

        if (tagIds is not null)
        {
            category.ReplaceTags(tagIds);
        }

        if (request.IsFeatured == true)
        {
            category.MarkAsFeatured();
        }
        else if (request.IsFeatured == false)
        {
            category.UnmarkAsFeatured();
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var savedCategory = await _examCategories.GetByIdWithTagsAsync(
            category.Id,
            cancellationToken);

        return Result<ExamCategoryResponse, ExamCategoryError>.Success(
            ToResponse(savedCategory ?? category));
    }

    public async Task<ExamCategoryError> ArchiveAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var category = await _examCategories.GetByIdWithTagsAsync(id, cancellationToken);

        if (category is null)
        {
            return ExamCategoryError.NotFound;
        }

        category.Archive();

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ExamCategoryError.None;
    }

    public async Task<ExamCategoryError> RestoreAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var category = await _examCategories.GetByIdWithTagsAsync(id, cancellationToken);

        if (category is null)
        {
            return ExamCategoryError.NotFound;
        }

        category.Restore();

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ExamCategoryError.None;
    }

    private async Task<Result<IReadOnlyCollection<Guid>, ExamCategoryError>> ValidateTagIdsAsync(
        IReadOnlyCollection<Guid> tagIds,
        CancellationToken cancellationToken)
    {
        var distinctTagIds = tagIds.Distinct().ToList();

        if (distinctTagIds.Count != tagIds.Count)
        {
            return Result<IReadOnlyCollection<Guid>, ExamCategoryError>.Failure(
                ExamCategoryError.DuplicateTagIds);
        }

        var existingTagIds = await _examCategories.GetExistingActiveTagIdsAsync(
            distinctTagIds,
            cancellationToken);

        var missingOrArchivedTagIds = distinctTagIds
            .Except(existingTagIds)
            .ToList();

        if (missingOrArchivedTagIds.Count > 0)
        {
            return Result<IReadOnlyCollection<Guid>, ExamCategoryError>.Failure(
                ExamCategoryError.MissingOrArchivedTagIds,
                missingOrArchivedTagIds);
        }

        return Result<IReadOnlyCollection<Guid>, ExamCategoryError>.Success(distinctTagIds);
    }

    private static ExamCategoryError ValidateCategoryValues(
        string name,
        string? slug,
        string? description,
        ExamCategoryMatchMode matchMode)
    {
        if (!Enum.IsDefined(matchMode) || matchMode == ExamCategoryMatchMode.Unknown)
        {
            return ExamCategoryError.InvalidMatchMode;
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            return ExamCategoryError.InvalidName;
        }

        var normalizedName = TextNormalizer.NormalizeName(name);

        if (normalizedName.Length > ExamClassificationConstraints.NameMaxLength)
        {
            return ExamCategoryError.InvalidName;
        }

        var normalizedSlug = TextNormalizer.NormalizeSlug(
            string.IsNullOrWhiteSpace(slug) ? name : slug);

        if (normalizedSlug.Length > ExamClassificationConstraints.SlugMaxLength)
        {
            return ExamCategoryError.InvalidSlug;
        }

        if (string.IsNullOrWhiteSpace(description) ||
            description.Trim().Length > ExamClassificationConstraints.DescriptionMaxLength)
        {
            return ExamCategoryError.InvalidDescription;
        }

        return ExamCategoryError.None;
    }

    private static ExamCategoryResponse ToResponse(ExamCategory category)
    {
        var tags = category.ExamCategoryTags
            .Where(categoryTag => !categoryTag.ExamTag.IsArchived)
            .Select(categoryTag => new ExamCategoryTagResponse(
                categoryTag.ExamTag.Id,
                categoryTag.ExamTag.Name,
                categoryTag.ExamTag.Slug,
                categoryTag.ExamTag.Type))
            .OrderBy(tag => tag.Type)
            .ThenBy(tag => tag.Name)
            .ToList();

        return new ExamCategoryResponse(
            category.Id,
            category.Name,
            category.Slug,
            category.Description,
            category.MatchMode,
            category.IsFeatured,
            category.IsArchived,
            category.DisplayOrder,
            category.CreatedAtUtc,
            category.UpdatedAtUtc,
            tags);
    }
}