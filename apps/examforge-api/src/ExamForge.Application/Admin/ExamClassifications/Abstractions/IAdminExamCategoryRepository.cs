using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Admin.ExamClassifications.Abstractions;

public interface IAdminExamCategoryRepository
{
    Task<IReadOnlyCollection<ExamCategory>> ListAsync(
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