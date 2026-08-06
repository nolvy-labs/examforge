using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.ExamClassifications.Abstractions;
using ExamForge.Application.Admin.ExamClassifications.Dtos;
using ExamForge.Application.Admin.ExamClassifications.Errors;
using ExamForge.Application.Common;
using ExamForge.Domain.Common;
using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Admin.ExamClassifications.Services;

public sealed class AdminExamTagService
{
    private readonly IAdminExamTagRepository _examTags;
    private readonly IUnitOfWork _unitOfWork;

    public AdminExamTagService(
        IAdminExamTagRepository examTags,
        IUnitOfWork unitOfWork)
    {
        _examTags = examTags;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<ExamTagResponse>> ListAsync(
        ExamTagType? type,
        bool includeArchived,
        CancellationToken cancellationToken = default)
    {
        var tags = await _examTags.ListAsync(type, includeArchived, cancellationToken);

        return tags.Select(ToResponse).ToList();
    }

    public async Task<Result<ExamTagResponse, ExamTagError>> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var tag = await _examTags.GetByIdAsync(id, cancellationToken);

        if (tag is null)
        {
            return Result<ExamTagResponse, ExamTagError>.Failure(ExamTagError.NotFound);
        }

        return Result<ExamTagResponse, ExamTagError>.Success(ToResponse(tag));
    }

    public async Task<Result<ExamTagResponse, ExamTagError>> CreateAsync(
        CreateExamTagRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateTagValues(
            request.Name,
            request.Slug,
            request.Description,
            request.Type);

        if (validationError != ExamTagError.None)
        {
            return Result<ExamTagResponse, ExamTagError>.Failure(validationError);
        }

        var tag = new ExamTag(
            request.Name,
            request.Slug,
            request.Description,
            request.Type);

        if (await _examTags.ExistsByTypeAndSlugAsync(
                tag.Type,
                tag.Slug,
                excludeId: null,
                cancellationToken))
        {
            return Result<ExamTagResponse, ExamTagError>.Failure(ExamTagError.SlugAlreadyExists);
        }

        _examTags.Add(tag);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<ExamTagResponse, ExamTagError>.Success(ToResponse(tag));
    }

    public async Task<Result<ExamTagResponse, ExamTagError>> UpdateAsync(
        Guid id,
        UpdateExamTagRequest request,
        CancellationToken cancellationToken = default)
    {
        var tag = await _examTags.GetByIdAsync(
            id,
            cancellationToken);

        if (tag is null)
        {
            return Result<ExamTagResponse, ExamTagError>.Failure(ExamTagError.NotFound);
        }

        var newName = request.Name ?? tag.Name;
        var newSlug = request.Slug ?? tag.Slug;
        var newDescription = request.Description ?? tag.Description;
        var newType = request.Type ?? tag.Type;

        var validationError = ValidateTagValues(
            newName,
            newSlug,
            newDescription,
            newType);

        if (validationError != ExamTagError.None)
        {
            return Result<ExamTagResponse, ExamTagError>.Failure(validationError);
        }

        var normalizedSlug = TextNormalizer.NormalizeSlug(newSlug);

        if (await _examTags.ExistsByTypeAndSlugAsync(
                newType,
                normalizedSlug,
                excludeId: id,
                cancellationToken))
        {
            return Result<ExamTagResponse, ExamTagError>.Failure(ExamTagError.SlugAlreadyExists);
        }

        tag.UpdateDetails(
            newName,
            normalizedSlug,
            newDescription,
            newType);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<ExamTagResponse, ExamTagError>.Success(ToResponse(tag));
    }

    public async Task<ExamTagError> ArchiveAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var tag = await _examTags.GetByIdAsync(
            id,
            cancellationToken);

        if (tag is null)
        {
            return ExamTagError.NotFound;
        }

        tag.Archive();

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ExamTagError.None;
    }

    public async Task<ExamTagError> RestoreAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var tag = await _examTags.GetByIdAsync(
            id,
            cancellationToken);

        if (tag is null)
        {
            return ExamTagError.NotFound;
        }

        tag.Restore();

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ExamTagError.None;
    }

    private static ExamTagError ValidateTagValues(
        string name,
        string? slug,
        string? description,
        ExamTagType type)
    {
        if (!IsValidType(type))
        {
            return ExamTagError.InvalidType;
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            return ExamTagError.InvalidName;
        }

        var normalizedName = TextNormalizer.NormalizeName(name);

        if (normalizedName.Length > ExamClassificationConstraints.NameMaxLength)
        {
            return ExamTagError.InvalidName;
        }

        var normalizedSlug = TextNormalizer.NormalizeSlug(
            string.IsNullOrWhiteSpace(slug) ? name : slug);

        if (normalizedSlug.Length > ExamClassificationConstraints.SlugMaxLength)
        {
            return ExamTagError.InvalidSlug;
        }

        if (description?.Trim().Length > ExamClassificationConstraints.DescriptionMaxLength)
        {
            return ExamTagError.InvalidDescription;
        }

        return ExamTagError.None;
    }

    private static bool IsValidType(ExamTagType type)
    {
        return Enum.IsDefined(type) && type != ExamTagType.Unknown;
    }

    private static ExamTagResponse ToResponse(ExamTag tag)
    {
        return new ExamTagResponse(
            tag.Id,
            tag.Name,
            tag.Slug,
            tag.Description,
            tag.Type,
            tag.IsArchived,
            tag.CreatedAtUtc,
            tag.UpdatedAtUtc);
    }
}