using ExamForge.Application.Exams;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Abstractions;

public interface IFillAnswerKeyRepository
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
