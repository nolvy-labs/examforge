using ExamForge.Application.Exams;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Abstractions;

public interface IExamRepository
{
    Task<ExamRepositoryPage> GetPageAsync(
        ExamPageQuery query,
        CancellationToken cancellationToken = default);

    Task<ExamData?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<Exam?> GetTrackedWithTagMappingsAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsBySlugAsync(
        string slug,
        Guid? excludedExamId = null,
        CancellationToken cancellationToken = default);

    void Add(Exam exam);
}