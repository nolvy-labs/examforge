using ExamForge.Application.Student.Exams.Models;

namespace ExamForge.Application.Student.Exams.Abstractions;

public interface IStudentExamQuery
{
    Task<StudentExamPageModel> GetPageAsync(StudentExamPageQuery request, CancellationToken cancellationToken = default);
    Task<StudentPublishedExamModel?> GetPublishedExamAsync(string idOrSlug, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StudentExamTagModel>> GetActiveTagsAsync(Guid examId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StudentSectionModel>> GetSectionsAsync(Guid versionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StudentSectionIdentifierModel>> GetSectionIdentifiersAsync(Guid versionId, CancellationToken cancellationToken = default);
    Task<StudentSectionModel?> GetSectionAsync(Guid versionId, Guid sectionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StudentQuestionModel>> GetQuestionsAsync(IReadOnlyCollection<Guid> sectionIds, bool includeSolutions, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StudentOptionModel>> GetOptionsAsync(IReadOnlyCollection<Guid> questionIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StudentOptionSolutionModel>> GetOptionSolutionsAsync(IReadOnlyCollection<Guid> questionIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StudentFillAnswerModel>> GetFillAnswersAsync(IReadOnlyCollection<Guid> questionIds, CancellationToken cancellationToken = default);
}
