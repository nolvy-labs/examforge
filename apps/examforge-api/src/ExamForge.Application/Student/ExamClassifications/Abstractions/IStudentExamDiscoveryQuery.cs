using ExamForge.Application.Student.ExamClassifications.Models;

namespace ExamForge.Application.Student.ExamClassifications.Abstractions;

public interface IStudentExamDiscoveryQuery
{
    Task<IReadOnlyList<StudentExamFilterTagModel>> GetFilterTagsAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StudentExamCategoryModel>> GetCategoriesAsync(
        bool featuredOnly,
        CancellationToken cancellationToken = default);

    Task<StudentExamCategoryRuleModel?> GetCategoryRuleBySlugAsync(
        string slug,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<Guid>> GetActiveTagIdsAsync(
        IReadOnlyCollection<Guid> tagIds,
        CancellationToken cancellationToken = default);
}
