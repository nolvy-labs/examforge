using ExamForge.Application.Student.Exams.Models;

namespace ExamForge.Application.Student.Exams.Abstractions;

public interface IStudentExamQuery
{
    Task<StudentExamPageModel> GetPageAsync(StudentExamPageQuery request, CancellationToken cancellationToken = default);
    Task<StudentPublishedExamModel?> GetPublishedExamAsync(string idOrSlug, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StudentExamTagModel>> GetActiveTagsAsync(Guid examId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StudentSectionModel>> GetSectionsAsync(Guid versionId, CancellationToken cancellationToken = default);
}
