using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Abstractions.ExamClassification;

public interface IExamTagRepository
{
    Task<IReadOnlyList<ExamTag>> ListAsync(
        ExamTagType? type,
        bool includeArchived,
        CancellationToken cancellationToken = default);

    Task<ExamTag?> GetByIdAsync(
        Guid id,
        bool includeArchived,
        CancellationToken cancellationToken = default);

    Task<ExamTag?> GetByTypeAndSlugAsync(
        ExamTagType type,
        string slug,
        bool includeArchived,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsByTypeAndSlugAsync(
        ExamTagType type,
        string slug,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default);

    void Add(ExamTag tag);
}
