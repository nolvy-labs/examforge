using System.Text.Json;

using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Dtos;

public static class PatchDocumentLimits
{
    public const int MaximumOperations = 20;
    public const int MaximumPathLength = 128;
}

public sealed record PatchOperation(
    string? Op,
    string? Path,
    JsonElement? Value = null,
    string? From = null);

public sealed record PatchValidationError(
    int OperationIndex,
    string? Path,
    string Code,
    string Message);

public sealed class ExamPatchModel
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ExamType Type { get; set; }
}

public sealed class ExamVersionPatchModel
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Instructions { get; set; }
    public int? DurationMinutes { get; set; }
}

public sealed class ExamSectionPatchModel
{
    public ExamSectionKind Kind { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public string? StimulusText { get; set; }
    public string? MediaUrl { get; set; }
}

public sealed class QuestionPatchModel
{
    public QuestionType Type { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public decimal Points { get; set; }
}

public sealed class QuestionOptionPatchModel
{
    public string Text { get; set; } = string.Empty;
    public string? Label { get; set; }
    public bool IsCorrect { get; set; }
    public string? Explanation { get; set; }
}

public sealed class FillAnswerKeyPatchModel
{
    public string AcceptedAnswer { get; set; } = string.Empty;
    public bool IsCaseSensitive { get; set; }
}

public sealed record ReplaceExamTagsRequest(IReadOnlyCollection<Guid> TagIds);