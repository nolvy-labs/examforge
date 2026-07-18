using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Abstractions;

public interface IAdminFillAnswerKeyRepository
{
    Task<IReadOnlyList<FillAnswerKeyData>> GetListAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken = default);

    Task<FillAnswerKeyData?> GetDetailAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        Guid answerKeyId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FillAnswerKey>> GetTrackedListAsync(
        Guid questionId,
        CancellationToken cancellationToken = default);

    Task<int?> GetMaximumDisplayOrderAsync(
        Guid questionId,
        CancellationToken cancellationToken = default);

    void Add(FillAnswerKey answerKey);
    void Remove(FillAnswerKey answerKey);
}
