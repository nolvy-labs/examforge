using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Abstractions;

public interface IAdminQuestionOptionRepository
{
    Task<IReadOnlyList<QuestionOptionData>> GetListAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken = default);

    Task<QuestionOptionData?> GetDetailAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        Guid optionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<QuestionOption>> GetTrackedListAsync(
        Guid questionId,
        CancellationToken cancellationToken = default);

    Task<int?> GetMaximumDisplayOrderAsync(
        Guid questionId,
        CancellationToken cancellationToken = default);

    void Add(QuestionOption option);
    void Remove(QuestionOption option);
}