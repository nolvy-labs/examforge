using ExamForge.Domain.ExamAttempts;

namespace ExamForge.Application.Student.ExamAttempts.Models;

public sealed record AttemptCreatePersistenceResult(bool Created, Guid? ExistingAttemptId);

public sealed record AttemptSavePersistenceResult(
    bool Saved,
    long? CurrentRevision,
    ExamAttemptStatus? CurrentStatus);

public sealed record ExamAttemptPageModel(
    IReadOnlyList<ExamAttemptListModel> Items,
    int TotalItems);

public sealed record ExamAttemptListModel(
    Guid AttemptId,
    Guid ExamId,
    Guid ExamVersionId,
    string ExamTitle,
    string ExamSlug,
    ExamAttemptStatus Status,
    ExamAttemptMode Mode,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset? ExpiresAtUtc,
    DateTimeOffset? SubmittedAtUtc,
    DateTimeOffset? AbandonedAtUtc,
    decimal? Score,
    decimal? MaximumScore,
    long Revision,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record ExamAttemptAnswerPatch(
    Guid QuestionId,
    string? TextAnswer,
    IReadOnlyList<Guid> SelectedOptionIds,
    bool ReplaceText,
    bool ReplaceSelectedOptions);

public sealed record ExamAttemptPatchPlan(IReadOnlyList<ExamAttemptAnswerPatch> Answers);

public sealed record ExamAttemptAnswerGrade(
    ExamAttemptAnswer Answer,
    decimal AwardedScore,
    decimal MaximumScore,
    ExamAttemptAnswerGradingStatus Status);

public sealed record ExamAttemptScore(
    decimal Score,
    decimal MaximumScore,
    IReadOnlyList<ExamAttemptAnswerGrade> Answers);