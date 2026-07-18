using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Abstractions;

public interface IAdminExamSectionRepository
{
    Task<IReadOnlyList<ExamSectionData>> GetListAsync(
        Guid examId,
        Guid versionId,
        CancellationToken cancellationToken = default);

    Task<ExamSectionData?> GetDetailAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        CancellationToken cancellationToken = default);

    Task<ExamSection?> GetTrackedAsync(
        Guid versionId,
        Guid sectionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ExamSection>> GetTrackedListAsync(
        Guid versionId,
        CancellationToken cancellationToken = default);

    Task<int?> GetMaximumDisplayOrderAsync(
        Guid versionId,
        CancellationToken cancellationToken = default);

    void Add(ExamSection section);
    void Remove(ExamSection section);
}