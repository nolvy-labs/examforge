using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Abstractions;

public interface IAdminExamVersionContentBatchRepository
{
    Task<IReadOnlyList<ExamSection>> GetTrackedSectionsAsync(
        Guid versionId,
        IReadOnlyCollection<Guid> sectionIds,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<QuestionOption>> GetTrackedOptionsAsync(
        Guid versionId,
        IReadOnlyCollection<Guid> optionIds,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FillAnswerKey>> GetTrackedAnswerKeysAsync(
        Guid versionId,
        IReadOnlyCollection<Guid> answerKeyIds,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Question>> GetTrackedQuestionsWithContentAsync(
        Guid versionId,
        IReadOnlyCollection<Guid> questionIds,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Question>> GetTrackedQuestionsForScoreAsync(
        Guid versionId,
        CancellationToken cancellationToken = default);
}