using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Admin.ExamClassifications.Abstractions;

public interface IAdminExamTagRepository
{
    Task<IReadOnlyList<ExamTag>> ListAsync(
        ExamTagType? type,
        bool includeArchived,
        CancellationToken cancellationToken = default);

    Task<ExamTag?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsByTypeAndSlugAsync(
        ExamTagType type,
        string slug,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<Guid>> GetExistingActiveTagIdsAsync(
        IReadOnlyCollection<Guid> tagIds,
        CancellationToken cancellationToken = default);

    void Add(ExamTag tag);
}
