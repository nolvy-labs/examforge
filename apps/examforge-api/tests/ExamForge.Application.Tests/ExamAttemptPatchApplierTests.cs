using System.Text.Json;

using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Student.ExamAttempts.Patch;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class ExamAttemptPatchApplierTests
{
    [Fact]
    public void Builds_atomic_plan_for_multiple_answer_types_and_clears()
    {
        var fill = ExamAttemptTestFactory.Question(QuestionType.FillBlank);
        var choice = ExamAttemptTestFactory.Question(QuestionType.MultipleChoiceSingle);
        var option = ExamAttemptTestFactory.AddOption(choice, true, 0);
        var attempt = ExamAttemptTestFactory.CreateAttempt(fill, choice);
        var operations = new[]
        {
            Replace($"/answers/{fill.Id:D}/textAnswer", null),
            Replace($"/answers/{choice.Id:D}/selectedOptionIds", new[] { option.Id })
        };

        var result = ExamAttemptPatchApplier.Apply(operations, attempt);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.Answers.Count);
        Assert.Null(result.Value.Answers.Single(patch => patch.QuestionId == fill.Id).TextAnswer);
        Assert.Equal(
            option.Id,
            Assert.Single(result.Value.Answers.Single(
                patch => patch.QuestionId == choice.Id).SelectedOptionIds));
        Assert.All(attempt.Answers, answer =>
        {
            Assert.Null(answer.TextAnswer);
            Assert.Empty(answer.SelectedOptions);
        });
    }

    [Theory]
    [InlineData("add", "patch_operation_not_allowed")]
    [InlineData("remove", "patch_operation_not_allowed")]
    [InlineData("Replace", "patch_operation_not_allowed")]
    public void Rejects_unsupported_operations(string operation, string code)
    {
        var question = ExamAttemptTestFactory.Question(QuestionType.FillBlank);
        var attempt = ExamAttemptTestFactory.CreateAttempt(question);

        var result = ExamAttemptPatchApplier.Apply(
            [new PatchOperation(operation, $"/answers/{question.Id:D}/textAnswer", Element("x"))],
            attempt);

        Assert.Equal(code, Assert.Single(result.Error).Code);
    }

    [Fact]
    public void Rejects_duplicate_normalized_targets()
    {
        var question = ExamAttemptTestFactory.Question(QuestionType.FillBlank);
        var attempt = ExamAttemptTestFactory.CreateAttempt(question);
        var upperId = question.Id.ToString("D").ToUpperInvariant();

        var result = ExamAttemptPatchApplier.Apply(
            [
                Replace($"/answers/{question.Id:D}/textAnswer", "one"),
                Replace($"/answers/{upperId}/textAnswer", "two")
            ],
            attempt);

        Assert.Equal("duplicate_patch_target", Assert.Single(result.Error).Code);
    }

    [Fact]
    public void Rejects_malformed_question_ids_and_unsupported_paths()
    {
        var attempt = ExamAttemptTestFactory.CreateAttempt();

        var malformed = ExamAttemptPatchApplier.Apply(
            [Replace("/answers/not-a-guid/textAnswer", "x")],
            attempt);
        var unsupported = ExamAttemptPatchApplier.Apply(
            [Replace($"/answers/{Guid.NewGuid():D}/score", 1)],
            attempt);

        Assert.Equal("invalid_question_id", Assert.Single(malformed.Error).Code);
        Assert.Equal("invalid_patch_path", Assert.Single(unsupported.Error).Code);
    }

    [Fact]
    public void Rejects_question_and_option_outside_frozen_version()
    {
        var choice = ExamAttemptTestFactory.Question(QuestionType.MultipleChoiceSingle);
        ExamAttemptTestFactory.AddOption(choice, true, 0);
        var attempt = ExamAttemptTestFactory.CreateAttempt(choice);

        var unknownQuestion = ExamAttemptPatchApplier.Apply(
            [Replace($"/answers/{Guid.NewGuid():D}/selectedOptionIds", Array.Empty<Guid>())],
            attempt);
        var unknownOption = ExamAttemptPatchApplier.Apply(
            [Replace($"/answers/{choice.Id:D}/selectedOptionIds", new[] { Guid.NewGuid() })],
            attempt);

        Assert.Equal("question_not_in_attempt", Assert.Single(unknownQuestion.Error).Code);
        Assert.Equal("option_not_in_question", Assert.Single(unknownOption.Error).Code);
    }

    [Fact]
    public void Enforces_answer_type_single_cardinality_and_unique_options()
    {
        var fill = ExamAttemptTestFactory.Question(QuestionType.FillBlank);
        var choice = ExamAttemptTestFactory.Question(QuestionType.MultipleChoiceSingle);
        var first = ExamAttemptTestFactory.AddOption(choice, true, 0);
        var second = ExamAttemptTestFactory.AddOption(choice, false, 1);
        var attempt = ExamAttemptTestFactory.CreateAttempt(fill, choice);

        var wrongType = ExamAttemptPatchApplier.Apply(
            [Replace($"/answers/{fill.Id:D}/selectedOptionIds", Array.Empty<Guid>())],
            attempt);
        var cardinality = ExamAttemptPatchApplier.Apply(
            [Replace($"/answers/{choice.Id:D}/selectedOptionIds", new[] { first.Id, second.Id })],
            attempt);
        var duplicates = ExamAttemptPatchApplier.Apply(
            [Replace($"/answers/{choice.Id:D}/selectedOptionIds", new[] { first.Id, first.Id })],
            attempt);

        Assert.Equal("invalid_answer_type", Assert.Single(wrongType.Error).Code);
        Assert.Equal("invalid_single_choice_cardinality", Assert.Single(cardinality.Error).Code);
        Assert.Equal("duplicate_option_id", Assert.Single(duplicates.Error).Code);
    }

    [Fact]
    public void Rejects_more_than_one_hundred_operations()
    {
        var question = ExamAttemptTestFactory.Question(QuestionType.FillBlank);
        var attempt = ExamAttemptTestFactory.CreateAttempt(question);
        var operations = Enumerable.Range(0, ExamAttemptPatchApplier.MaximumOperations + 1)
            .Select(index => Replace(
                $"/answers/{question.Id:D}/textAnswer",
                index.ToString()))
            .ToList();

        var result = ExamAttemptPatchApplier.Apply(operations, attempt);

        Assert.Equal("too_many_patch_operations", Assert.Single(result.Error).Code);
    }

    private static PatchOperation Replace(string path, object? value) =>
        new("replace", path, Element(value));

    private static JsonElement Element(object? value) =>
        JsonSerializer.SerializeToElement(value);
}