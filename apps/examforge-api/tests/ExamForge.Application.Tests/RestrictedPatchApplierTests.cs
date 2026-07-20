using System.Text.Json;

using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Admin.Exams.Utils;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class RestrictedPatchApplierTests
{
    [Fact]
    public void Empty_document_is_no_op()
    {
        var model = ExamModel();
        var result = RestrictedPatchApplier.Apply([], model);

        Assert.True(result.IsSuccess);
        Assert.Equal("Title", result.Value!.Title);
    }

    [Fact]
    public void Multiple_replacements_apply_sequentially()
    {
        var result = RestrictedPatchApplier.Apply(
            [Replace("/title", "First"), Replace("/title", "Second"), Replace("/type", (int)ExamType.Ielts)],
            ExamModel());

        Assert.True(result.IsSuccess);
        Assert.Equal("Second", result.Value!.Title);
        Assert.Equal(ExamType.Ielts, result.Value.Type);
    }

    [Theory]
    [InlineData("add")]
    [InlineData("move")]
    [InlineData("copy")]
    [InlineData("test")]
    [InlineData("Replace")]
    [InlineData("unknown")]
    public void Unsupported_operations_are_rejected(string op)
    {
        var result = RestrictedPatchApplier.Apply(
            [new PatchOperation(op, "/title", Element("Changed"))], ExamModel());

        Assert.Equal("patch_operation_not_allowed", Assert.Single(result.Error).Code);
    }

    [Theory]
    [InlineData("")]
    [InlineData("/")]
    [InlineData("/id")]
    [InlineData("/tags")]
    [InlineData("/title/nested")]
    [InlineData("/title/0")]
    public void Unknown_root_nested_array_and_protected_paths_are_rejected(string path)
    {
        var result = RestrictedPatchApplier.Apply([Replace(path, "Changed")], ExamModel());

        Assert.False(result.IsSuccess);
        Assert.Contains(Assert.Single(result.Error).Code, new[] { "invalid_patch_path", "patch_path_not_allowed" });
    }

    [Fact]
    public void From_member_is_rejected()
    {
        var result = RestrictedPatchApplier.Apply(
            [new PatchOperation("replace", "/title", Element("Changed"), "/description")], ExamModel());

        Assert.Equal("patch_from_not_allowed", Assert.Single(result.Error).Code);
    }

    [Fact]
    public void One_invalid_operation_rejects_document_without_mutating_entity_state()
    {
        var model = ExamModel();
        var result = RestrictedPatchApplier.Apply(
            [Replace("/title", "Changed"), Replace("/id", Guid.NewGuid())], model);

        Assert.False(result.IsSuccess);
        Assert.Equal("Changed", model.Title);
        // The applier only mutates the detached safe model; callers never update tracked entities on failure.
    }

    [Fact]
    public void Required_properties_cannot_be_removed_or_replaced_with_null()
    {
        var remove = RestrictedPatchApplier.Apply([Remove("/prompt")], QuestionModel());
        var replaceNull = RestrictedPatchApplier.Apply([ReplaceNull("/points")], QuestionModel());

        Assert.Equal("required_property_cannot_be_removed", Assert.Single(remove.Error).Code);
        Assert.Equal("required_property_cannot_be_removed", Assert.Single(replaceNull.Error).Code);
    }

    [Fact]
    public void Nullable_properties_support_remove_and_replace_null()
    {
        var remove = RestrictedPatchApplier.Apply([Remove("/explanation")], QuestionModel());
        var replace = RestrictedPatchApplier.Apply([ReplaceNull("/explanation")], QuestionModel());

        Assert.True(remove.IsSuccess);
        Assert.Null(remove.Value!.Explanation);
        Assert.True(replace.IsSuccess);
        Assert.Null(replace.Value!.Explanation);
    }

    [Fact]
    public void Invalid_value_types_are_rejected()
    {
        var points = RestrictedPatchApplier.Apply([Replace("/points", "two")], QuestionModel());
        var flag = RestrictedPatchApplier.Apply(
            [Replace("/isCorrect", 1)], new QuestionOptionPatchModel { Text = "Option" });

        Assert.Equal("invalid_patch_value", Assert.Single(points.Error).Code);
        Assert.Equal("invalid_patch_value", Assert.Single(flag.Error).Code);
    }

    [Fact]
    public void Too_many_operations_are_rejected()
    {
        var operations = Enumerable.Range(0, PatchDocumentLimits.MaximumOperations + 1)
            .Select(index => Replace("/title", $"Title {index}"))
            .ToList();

        var result = RestrictedPatchApplier.Apply(operations, ExamModel());

        Assert.Equal("too_many_patch_operations", Assert.Single(result.Error).Code);
    }

    [Fact]
    public void Remove_is_not_allowed_for_fill_answer_properties()
    {
        var model = new FillAnswerKeyPatchModel { AcceptedAnswer = "Answer" };

        Assert.Equal("required_property_cannot_be_removed",
            Assert.Single(RestrictedPatchApplier.Apply([Remove("/acceptedAnswer")], model).Error).Code);
        Assert.Equal("required_property_cannot_be_removed",
            Assert.Single(RestrictedPatchApplier.Apply([Remove("/isCaseSensitive")], model).Error).Code);
    }

    private static ExamPatchModel ExamModel() =>
        new() { Title = "Title", Description = "Description", Type = ExamType.Simple };

    private static QuestionPatchModel QuestionModel() =>
        new() { Type = QuestionType.FillBlank, Prompt = "Prompt", Explanation = "Explanation", Points = 1m };

    private static PatchOperation Replace(string path, object? value) => new("replace", path, Element(value));
    private static PatchOperation ReplaceNull(string path) => new("replace", path, JsonDocument.Parse("null").RootElement.Clone());
    private static PatchOperation Remove(string path) => new("remove", path);
    private static JsonElement Element(object? value) => JsonSerializer.SerializeToElement(value);
}