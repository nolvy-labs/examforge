using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Abstractions;

public interface IAdminQuestionRepository
{
    Task<IReadOnlyList<QuestionData>> GetListAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        CancellationToken cancellationToken = default);

    Task<QuestionDetailData?> GetDetailAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken = default);

    Task<Question?> GetTrackedAsync(
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Question>> GetTrackedSiblingsAsync(
        Guid sectionId,
        Guid? parentQuestionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Question>> GetTrackedChildrenAsync(
        Guid sectionId,
        Guid parentQuestionId,
        CancellationToken cancellationToken = default);

    Task<int?> GetMaximumDisplayOrderAsync(
        Guid sectionId,
        Guid? parentQuestionId,
        CancellationToken cancellationToken = default);

    Task<decimal> GetVersionTotalScoreAsync(
        Guid versionId,
        CancellationToken cancellationToken = default);

    void Add(Question question);
    void Remove(Question question);
    void RemoveRange(IEnumerable<Question> questions);
}
