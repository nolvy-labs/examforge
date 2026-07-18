using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Abstractions;

public interface IAdminExamRepository
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