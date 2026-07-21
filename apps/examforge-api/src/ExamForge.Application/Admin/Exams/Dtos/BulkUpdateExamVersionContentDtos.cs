namespace ExamForge.Application.Admin.Exams.Dtos;

public static class BulkUpdateExamVersionContentLimits
{
    public const int MaximumTargets = 1_000;
    public const int MaximumOperationsPerTarget = PatchDocumentLimits.MaximumOperations;
    public const int MaximumTotalOperations = 5_000;
}

public sealed record BulkUpdateExamVersionContentRequest(
    IReadOnlyList<PatchOperation>? VersionPatch = null,
    IReadOnlyList<SectionPatchTarget?>? SectionPatches = null,
    IReadOnlyList<QuestionPatchTarget?>? QuestionPatches = null,
    IReadOnlyList<QuestionOptionPatchTarget?>? OptionPatches = null,
    IReadOnlyList<FillAnswerKeyPatchTarget?>? AnswerKeyPatches = null);

public sealed record SectionPatchTarget(
    Guid SectionId,
    IReadOnlyList<PatchOperation>? Operations);

public sealed record QuestionPatchTarget(
    Guid QuestionId,
    IReadOnlyList<PatchOperation>? Operations);

public sealed record QuestionOptionPatchTarget(
    Guid OptionId,
    IReadOnlyList<PatchOperation>? Operations);

public sealed record FillAnswerKeyPatchTarget(
    Guid AnswerKeyId,
    IReadOnlyList<PatchOperation>? Operations);

public sealed record BulkContentValidationError(
    string Path,
    string Code,
    string Message);

public sealed record BulkUpdateExamVersionContentResponse(
    long ContentRevision,
    ExamVersionDetailResponse Version,
    IReadOnlyList<ExamSectionDetailResponse> UpdatedSections,
    IReadOnlyList<QuestionDetailResponse> UpdatedQuestions,
    IReadOnlyList<QuestionOptionResponse> UpdatedOptions,
    IReadOnlyList<FillAnswerKeyResponse> UpdatedAnswerKeys);