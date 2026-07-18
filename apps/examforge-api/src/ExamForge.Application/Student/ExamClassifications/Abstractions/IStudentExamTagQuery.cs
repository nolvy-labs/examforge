using ExamForge.Application.Student.ExamClassifications.Models;
using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Student.ExamClassifications.Abstractions;

public interface IStudentExamTagQuery
{
    Task<IReadOnlyList<StudentExamTagModel>> ListActiveAsync(
        ExamTagType? type,
        CancellationToken cancellationToken = default);

    Task<StudentExamTagModel?> GetActiveByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<StudentExamTagModel?> GetActiveByTypeAndSlugAsync(
        ExamTagType type,
        string slug,
        CancellationToken cancellationToken = default);
}
