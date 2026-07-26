using System.Text.Json;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Common;
using ExamForge.Application.Student.ExamAttempts.Models;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Student.ExamAttempts.Patch;

public static class ExamAttemptPatchApplier
{
    public const int MaximumOperations = 100;

    public static Result<ExamAttemptPatchPlan, IReadOnlyList<PatchValidationError>> Apply(
        IReadOnlyList<PatchOperation>? operations,
        ExamAttempt attempt)
    {
        if (operations is null)
        {
            return Failure(Error(0, null, "patch_document_required", "A JSON Patch document is required."));
        }

        if (operations.Count > MaximumOperations)
        {
            return Failure(Error(
                MaximumOperations,
                null,
                "too_many_patch_operations",
                $"A patch document cannot contain more than {MaximumOperations} operations."));
        }

        var answerByQuestion = attempt.Answers.ToDictionary(answer => answer.QuestionId);
        var questionById = attempt.ExamVersion.Sections
            .SelectMany(section => section.Questions)
            .ToDictionary(question => question.Id);
        var states = answerByQuestion.ToDictionary(
            pair => pair.Key,
            pair => new MutableAnswerState(
                pair.Value.TextAnswer,
                pair.Value.SelectedOptions.Select(option => option.QuestionOptionId).ToList()));
        var targets = new HashSet<string>(StringComparer.Ordinal);

        for (var index = 0; index < operations.Count; index++)
        {
            var operation = operations[index];
            if (operation is null)
            {
                return Failure(Error(
                    index,
                    null,
                    "patch_operation_required",
                    "Patch operations cannot be null."));
            }

            if (operation.Op != "replace")
            {
                return Failure(Error(
                    index,
                    operation.Path,
                    "patch_operation_not_allowed",
                    "Only the 'replace' operation is supported."));
            }

            if (operation.From is not null)
            {
                return Failure(Error(
                    index,
                    operation.Path,
                    "patch_from_not_allowed",
                    "The 'from' member is not supported."));
            }

            var pathResult = ParsePath(operation.Path, index);
            if (pathResult.Error is not null)
            {
                return Failure(pathResult.Error);
            }

            var target = pathResult.Target!;
            var normalizedTarget = $"/answers/{target.QuestionId:D}/{target.Property}";
            if (!targets.Add(normalizedTarget))
            {
                return Failure(Error(
                    index,
                    operation.Path,
                    "duplicate_patch_target",
                    $"The target '{normalizedTarget}' occurs more than once."));
            }

            if (!questionById.TryGetValue(target.QuestionId, out var question))
            {
                return Failure(Error(
                    index,
                    operation.Path,
                    "question_not_in_attempt",
                    "The question is not part of the attempted exam version."));
            }

            if (question.Type == QuestionType.Group || !answerByQuestion.ContainsKey(question.Id))
            {
                return Failure(Error(
                    index,
                    operation.Path,
                    "question_not_answerable",
                    "Group questions cannot be answered."));
            }

            var state = states[question.Id];
            var valueError = target.Property switch
            {
                "textAnswer" => ApplyText(operation, index, question, state),
                "selectedOptionIds" => ApplyOptions(operation, index, question, state),
                _ => Error(index, operation.Path, "invalid_patch_path", "The patch path is invalid.")
            };
            if (valueError is not null)
            {
                return Failure(valueError);
            }
        }

        var patches = states
            .Where(pair => pair.Value.ReplaceText || pair.Value.ReplaceSelectedOptions)
            .Select(pair => new ExamAttemptAnswerPatch(
                pair.Key,
                pair.Value.TextAnswer,
                pair.Value.SelectedOptionIds,
                pair.Value.ReplaceText,
                pair.Value.ReplaceSelectedOptions))
            .ToList();
        return Result<ExamAttemptPatchPlan, IReadOnlyList<PatchValidationError>>.Success(
            new ExamAttemptPatchPlan(patches));
    }

    private static PatchValidationError? ApplyText(
        PatchOperation operation,
        int index,
        Question question,
        MutableAnswerState state)
    {
        if (question.Type != QuestionType.FillBlank)
        {
            return Error(
                index,
                operation.Path,
                "invalid_answer_type",
                "Text answers are supported only for fill-blank questions.");
        }

        string? textAnswer;
        if (!operation.Value.HasValue || operation.Value.Value.ValueKind == JsonValueKind.Null)
        {
            textAnswer = null;
        }
        else if (operation.Value.Value.ValueKind == JsonValueKind.String)
        {
            textAnswer = operation.Value.Value.GetString()?.Trim();
            if (textAnswer?.Length > FillAnswerKeyConstraints.AcceptedAnswerMaxLength)
            {
                return Error(
                    index,
                    operation.Path,
                    "invalid_text_answer",
                    $"Text answers cannot exceed {FillAnswerKeyConstraints.AcceptedAnswerMaxLength} characters.");
            }
        }
        else
        {
            return InvalidValue(operation, index);
        }

        state.TextAnswer = textAnswer;
        state.ReplaceText = true;
        return null;
    }

    private static PatchValidationError? ApplyOptions(
        PatchOperation operation,
        int index,
        Question question,
        MutableAnswerState state)
    {
        if (question.Type is not (
            QuestionType.MultipleChoiceSingle or
            QuestionType.MultipleChoiceMultiple))
        {
            return Error(
                index,
                operation.Path,
                "invalid_answer_type",
                "Option selections are supported only for multiple-choice questions.");
        }

        if (!operation.Value.HasValue ||
            operation.Value.Value.ValueKind != JsonValueKind.Array)
        {
            return InvalidValue(operation, index);
        }

        var optionIds = new List<Guid>();
        foreach (var element in operation.Value.Value.EnumerateArray())
        {
            if (element.ValueKind != JsonValueKind.String ||
                !Guid.TryParse(element.GetString(), out var optionId))
            {
                return Error(
                    index,
                    operation.Path,
                    "invalid_option_id",
                    "Selected option IDs must be GUID strings.");
            }

            optionIds.Add(optionId);
        }

        if (optionIds.Count != optionIds.Distinct().Count())
        {
            return Error(
                index,
                operation.Path,
                "duplicate_option_id",
                "Selected option IDs must be unique.");
        }

        if (question.Type == QuestionType.MultipleChoiceSingle && optionIds.Count > 1)
        {
            return Error(
                index,
                operation.Path,
                "invalid_single_choice_cardinality",
                "A single-choice question accepts at most one selected option.");
        }

        var validOptionIds = question.Options.Select(option => option.Id).ToHashSet();
        if (optionIds.Any(optionId => !validOptionIds.Contains(optionId)))
        {
            return Error(
                index,
                operation.Path,
                "option_not_in_question",
                "Every selected option must belong to the targeted question.");
        }

        state.SelectedOptionIds = optionIds;
        state.ReplaceSelectedOptions = true;
        return null;
    }

    private static PathParseResult ParsePath(string? path, int index)
    {
        if (string.IsNullOrEmpty(path) ||
            path.Length > PatchDocumentLimits.MaximumPathLength)
        {
            return new(null, Error(index, path, "invalid_patch_path", "The patch path is invalid."));
        }

        var segments = path.Split('/');
        if (segments.Length != 4 ||
            segments[0].Length != 0 ||
            segments[1] != "answers" ||
            segments[3] is not ("textAnswer" or "selectedOptionIds"))
        {
            return new(null, Error(
                index,
                path,
                "invalid_patch_path",
                "Supported paths are '/answers/{questionId}/textAnswer' and '/answers/{questionId}/selectedOptionIds'."));
        }

        if (!Guid.TryParseExact(segments[2], "D", out var questionId))
        {
            return new(null, Error(
                index,
                path,
                "invalid_question_id",
                "The question ID in the patch path must be a canonical GUID."));
        }

        return new(new PatchTarget(questionId, segments[3]), null);
    }

    private static PatchValidationError InvalidValue(PatchOperation operation, int index) =>
        Error(
            index,
            operation.Path,
            "invalid_patch_value",
            $"The value for '{operation.Path}' has an invalid type or value.");

    private static PatchValidationError Error(
        int index,
        string? path,
        string code,
        string message) =>
        new(index, path, code, message);

    private static Result<ExamAttemptPatchPlan, IReadOnlyList<PatchValidationError>> Failure(
        PatchValidationError error) =>
        Result<ExamAttemptPatchPlan, IReadOnlyList<PatchValidationError>>.Failure([error]);

    private sealed record PatchTarget(Guid QuestionId, string Property);
    private sealed record PathParseResult(PatchTarget? Target, PatchValidationError? Error);

    private sealed class MutableAnswerState
    {
        public MutableAnswerState(string? textAnswer, IReadOnlyList<Guid> selectedOptionIds)
        {
            TextAnswer = textAnswer;
            SelectedOptionIds = selectedOptionIds;
        }

        public string? TextAnswer { get; set; }
        public IReadOnlyList<Guid> SelectedOptionIds { get; set; }
        public bool ReplaceText { get; set; }
        public bool ReplaceSelectedOptions { get; set; }
    }
}
