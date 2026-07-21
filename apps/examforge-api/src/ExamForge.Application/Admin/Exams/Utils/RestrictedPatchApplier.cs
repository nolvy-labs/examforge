using System.Text.Json;

using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Common;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Utils;

public static class RestrictedPatchApplier
{
    public static IReadOnlyList<PatchValidationError>? ValidateDocumentLimits(
        IReadOnlyList<PatchOperation>? operations)
    {
        if (operations is null)
            return [new(0, null, "patch_document_required", "A JSON Patch document is required.")];
        if (operations.Count > PatchDocumentLimits.MaximumOperations)
            return [new(PatchDocumentLimits.MaximumOperations, null, "too_many_patch_operations",
                $"A patch document cannot contain more than {PatchDocumentLimits.MaximumOperations} operations.")];
        return null;
    }

    public static Result<ExamPatchModel, IReadOnlyList<PatchValidationError>> Apply(
        IReadOnlyList<PatchOperation>? operations,
        ExamPatchModel model) => ApplyCore(operations, model, ApplyExamOperation);

    public static Result<ExamVersionPatchModel, IReadOnlyList<PatchValidationError>> Apply(
        IReadOnlyList<PatchOperation>? operations,
        ExamVersionPatchModel model) => ApplyCore(operations, model, ApplyVersionOperation);

    public static Result<ExamSectionPatchModel, IReadOnlyList<PatchValidationError>> Apply(
        IReadOnlyList<PatchOperation>? operations,
        ExamSectionPatchModel model) => ApplyCore(operations, model, ApplySectionOperation);

    public static Result<QuestionPatchModel, IReadOnlyList<PatchValidationError>> Apply(
        IReadOnlyList<PatchOperation>? operations,
        QuestionPatchModel model) => ApplyCore(operations, model, ApplyQuestionOperation);

    public static Result<QuestionOptionPatchModel, IReadOnlyList<PatchValidationError>> Apply(
        IReadOnlyList<PatchOperation>? operations,
        QuestionOptionPatchModel model) => ApplyCore(operations, model, ApplyOptionOperation);

    public static Result<FillAnswerKeyPatchModel, IReadOnlyList<PatchValidationError>> Apply(
        IReadOnlyList<PatchOperation>? operations,
        FillAnswerKeyPatchModel model) => ApplyCore(operations, model, ApplyAnswerKeyOperation);

    private static Result<TModel, IReadOnlyList<PatchValidationError>> ApplyCore<TModel>(
        IReadOnlyList<PatchOperation>? operations,
        TModel model,
        Func<PatchOperation, int, TModel, PatchValidationError?> apply)
    {
        var limitErrors = ValidateDocumentLimits(operations);
        if (limitErrors is not null)
            return Result<TModel, IReadOnlyList<PatchValidationError>>.Failure(limitErrors);
        var patchOperations = operations!;

        for (var index = 0; index < patchOperations.Count; index++)
        {
            var operation = patchOperations[index];
            if (operation is null)
            {
                return Failure<TModel>(Error(
                    index, null, "patch_operation_required", "Patch operations cannot be null."));
            }
            var commonError = ValidateCommon(operation, index);
            if (commonError is not null)
            {
                return Failure<TModel>(commonError);
            }

            var error = apply(operation, index, model);
            if (error is not null)
            {
                return Failure<TModel>(error);
            }
        }

        return Result<TModel, IReadOnlyList<PatchValidationError>>.Success(model);
    }

    private static PatchValidationError? ValidateCommon(PatchOperation operation, int index)
    {
        if (operation.Op is not ("replace" or "remove"))
        {
            return Error(index, operation.Path, "patch_operation_not_allowed", "Only 'replace' and 'remove' operations are supported.");
        }

        if (operation.From is not null)
        {
            return Error(index, operation.Path, "patch_from_not_allowed", "The 'from' member is not supported.");
        }

        if (string.IsNullOrEmpty(operation.Path) || operation.Path.Length > PatchDocumentLimits.MaximumPathLength)
        {
            return Error(index, operation.Path, "invalid_patch_path", "The patch path is invalid.");
        }

        return null;
    }

    private static PatchValidationError? ApplyExamOperation(PatchOperation operation, int index, ExamPatchModel model)
    {
        switch (operation.Path)
        {
            case "/title":
                return ApplyRequiredString(operation, index, value => model.Title = value);
            case "/description":
                return ApplyNullableString(operation, index, value => model.Description = value);
            case "/type":
                return ApplyEnum(operation, index, (ExamType value) => model.Type = value);
            default:
                return PathNotAllowed(operation, index);
        }
    }

    private static PatchValidationError? ApplyVersionOperation(PatchOperation operation, int index, ExamVersionPatchModel model)
    {
        switch (operation.Path)
        {
            case "/title":
                return ApplyRequiredString(operation, index, value => model.Title = value);
            case "/description":
                return ApplyNullableString(operation, index, value => model.Description = value);
            case "/instructions":
                return ApplyNullableString(operation, index, value => model.Instructions = value);
            case "/durationMinutes":
                if (operation.Op == "remove" || IsNull(operation.Value))
                {
                    model.DurationMinutes = null;
                    return null;
                }
                if (!TryGetInt32(operation.Value, out var duration))
                    return InvalidValue(operation, index);
                model.DurationMinutes = duration;
                return null;
            default:
                return PathNotAllowed(operation, index);
        }
    }

    private static PatchValidationError? ApplySectionOperation(PatchOperation operation, int index, ExamSectionPatchModel model)
    {
        switch (operation.Path)
        {
            case "/kind":
                return ApplyEnum(operation, index, (ExamSectionKind value) => model.Kind = value);
            case "/title":
                return ApplyRequiredString(operation, index, value => model.Title = value);
            case "/instructions":
                return ApplyNullableString(operation, index, value => model.Instructions = value);
            case "/stimulusText":
                return ApplyNullableString(operation, index, value => model.StimulusText = value);
            case "/mediaUrl":
                return ApplyNullableString(operation, index, value => model.MediaUrl = value);
            default:
                return PathNotAllowed(operation, index);
        }
    }

    private static PatchValidationError? ApplyQuestionOperation(PatchOperation operation, int index, QuestionPatchModel model)
    {
        switch (operation.Path)
        {
            case "/type":
                return ApplyEnum(operation, index, (QuestionType value) => model.Type = value);
            case "/prompt":
                return ApplyRequiredString(operation, index, value => model.Prompt = value);
            case "/explanation":
                return ApplyNullableString(operation, index, value => model.Explanation = value);
            case "/points":
                if (operation.Op == "remove" || IsNull(operation.Value))
                    return RequiredProperty(operation, index);
                if (!TryGetDecimal(operation.Value, out var points))
                    return InvalidValue(operation, index);
                model.Points = points;
                return null;
            default:
                return PathNotAllowed(operation, index);
        }
    }

    private static PatchValidationError? ApplyOptionOperation(PatchOperation operation, int index, QuestionOptionPatchModel model)
    {
        switch (operation.Path)
        {
            case "/text":
                return ApplyRequiredString(operation, index, value => model.Text = value);
            case "/label":
                return ApplyNullableString(operation, index, value => model.Label = value);
            case "/isCorrect":
                if (operation.Op == "remove" || IsNull(operation.Value))
                    return RequiredProperty(operation, index);
                if (!TryGetBoolean(operation.Value, out var isCorrect))
                    return InvalidValue(operation, index);
                model.IsCorrect = isCorrect;
                return null;
            case "/explanation":
                return ApplyNullableString(operation, index, value => model.Explanation = value);
            default:
                return PathNotAllowed(operation, index);
        }
    }

    private static PatchValidationError? ApplyAnswerKeyOperation(PatchOperation operation, int index, FillAnswerKeyPatchModel model)
    {
        switch (operation.Path)
        {
            case "/acceptedAnswer":
                return ApplyRequiredString(operation, index, value => model.AcceptedAnswer = value);
            case "/isCaseSensitive":
                if (operation.Op == "remove" || IsNull(operation.Value))
                    return RequiredProperty(operation, index);
                if (!TryGetBoolean(operation.Value, out var isCaseSensitive))
                    return InvalidValue(operation, index);
                model.IsCaseSensitive = isCaseSensitive;
                return null;
            default:
                return PathNotAllowed(operation, index);
        }
    }

    private static PatchValidationError? ApplyRequiredString(
        PatchOperation operation,
        int index,
        Action<string> assign)
    {
        if (operation.Op == "remove" || IsNull(operation.Value))
            return RequiredProperty(operation, index);
        if (!TryGetString(operation.Value, out var value))
            return InvalidValue(operation, index);
        assign(value!);
        return null;
    }

    private static PatchValidationError? ApplyNullableString(
        PatchOperation operation,
        int index,
        Action<string?> assign)
    {
        if (operation.Op == "remove" || IsNull(operation.Value))
        {
            assign(null);
            return null;
        }
        if (!TryGetString(operation.Value, out var value))
            return InvalidValue(operation, index);
        assign(value);
        return null;
    }

    private static PatchValidationError? ApplyEnum<TEnum>(
        PatchOperation operation,
        int index,
        Action<TEnum> assign) where TEnum : struct, Enum
    {
        if (operation.Op == "remove" || IsNull(operation.Value))
            return RequiredProperty(operation, index);
        if (!TryGetInt32(operation.Value, out var numeric))
            return InvalidValue(operation, index);
        var value = (TEnum)Enum.ToObject(typeof(TEnum), numeric);
        if (!Enum.IsDefined(value))
            return InvalidValue(operation, index);
        assign(value);
        return null;
    }

    private static bool TryGetString(JsonElement? value, out string? result)
    {
        result = null;
        if (!value.HasValue || value.Value.ValueKind == JsonValueKind.Null)
            return true;
        if (value.Value.ValueKind != JsonValueKind.String)
            return false;
        result = value.Value.GetString();
        return true;
    }

    private static bool TryGetInt32(JsonElement? value, out int result)
    {
        result = default;
        return value.HasValue && value.Value.ValueKind == JsonValueKind.Number && value.Value.TryGetInt32(out result);
    }

    private static bool TryGetDecimal(JsonElement? value, out decimal result)
    {
        result = default;
        return value.HasValue && value.Value.ValueKind == JsonValueKind.Number && value.Value.TryGetDecimal(out result);
    }

    private static bool TryGetBoolean(JsonElement? value, out bool result)
    {
        result = false;
        if (!value.HasValue || value.Value.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
            return false;
        result = value.Value.GetBoolean();
        return true;
    }

    private static bool IsNull(JsonElement? value) => !value.HasValue || value.Value.ValueKind == JsonValueKind.Null;
    private static PatchValidationError PathNotAllowed(PatchOperation operation, int index) =>
        Error(index, operation.Path, "patch_path_not_allowed", $"Property '{operation.Path}' cannot be modified.");
    private static PatchValidationError InvalidValue(PatchOperation operation, int index) =>
        Error(index, operation.Path, "invalid_patch_value", $"The value for '{operation.Path}' has an invalid type or value.");
    private static PatchValidationError RequiredProperty(PatchOperation operation, int index) =>
        Error(index, operation.Path, "required_property_cannot_be_removed", $"Property '{operation.Path}' is required.");
    private static PatchValidationError Error(int index, string? path, string code, string message) => new(index, path, code, message);
    private static Result<TModel, IReadOnlyList<PatchValidationError>> Failure<TModel>(PatchValidationError error) =>
        Result<TModel, IReadOnlyList<PatchValidationError>>.Failure([error]);
}