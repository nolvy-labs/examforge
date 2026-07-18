using ExamForge.Application.Student.ExamClassifications.Models;

namespace ExamForge.Application.Student.ExamClassifications.Abstractions;

public interface IStudentExamCategoryQuery
{
    Task<IReadOnlyCollection<StudentExamCategoryModel>> ListActiveAsync(
        CancellationToken cancellationToken = default);

    Task<StudentExamCategoryModel?> GetActiveByIdOrSlugAsync(
        string idOrSlug,
        CancellationToken cancellationToken = default);
}
