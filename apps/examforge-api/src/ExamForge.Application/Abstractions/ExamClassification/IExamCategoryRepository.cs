using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Abstractions.ExamClassifications;

public interface IExamCategoryRepository
{
    Task<IReadOnlyCollection<ExamCategory>> GetPublicListAsync(
        CancellationToken cancellationToken = default);

    Task<ExamCategory?> GetPublicByIdOrSlugAsync(
        string idOrSlug,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<ExamCategory>> GetAdminListAsync(
        bool? isArchived,
        CancellationToken cancellationToken = default);

    Task<ExamCategory?> GetByIdWithTagsAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsBySlugAsync(
        string slug,
        Guid? excludedCategoryId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<Guid>> GetExistingActiveTagIdsAsync(
        IReadOnlyCollection<Guid> tagIds,
        CancellationToken cancellationToken = default);

    void Add(ExamCategory category);
}