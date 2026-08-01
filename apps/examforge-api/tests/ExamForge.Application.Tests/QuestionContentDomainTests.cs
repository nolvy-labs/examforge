using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class QuestionContentDomainTests
{
    [Fact]
    public void Question_constructor_normalizes_values_and_preserves_parent()
    {
        var parentId = Guid.NewGuid();
        var question = new Question(
            Guid.NewGuid(),
            parentId,
            QuestionType.FillBlank,
            "  Fill   this  ",
            "  Explanation  ",
            1.25m,
            2);

        Assert.Equal(parentId, question.ParentQuestionId);
        Assert.Equal("Fill this", question.Prompt);
        Assert.Equal("Explanation", question.Explanation);
        Assert.Equal(1.25m, question.Points);
        Assert.Empty(question.Options);
        Assert.Empty(question.FillAnswerKeys);
    }

    [Fact]
    public void Group_requires_zero_points_and_cannot_be_child()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => CreateQuestion(
            QuestionType.Group,
            points: 1m));
        Assert.Throws<ArgumentException>(() => new Question(
            Guid.NewGuid(),
            Guid.NewGuid(),
            QuestionType.Group,
            "Group",
            null,
            0m,
            0));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(1000000)]
    [InlineData(1.001)]
    public void Score_bearing_questions_reject_invalid_points(decimal points)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => CreateQuestion(
            QuestionType.FillBlank,
            points));
    }

    [Fact]
    public void Draft_question_fields_allow_empty_content_and_zero_points()
    {
        var question = new Question(
            Guid.NewGuid(),
            null,
            QuestionType.FillBlank,
            " ",
            " ",
            0m,
            0);

        Assert.Equal(string.Empty, question.Prompt);
        Assert.Equal(string.Empty, question.Explanation);
        Assert.Equal(0m, question.Points);
    }

    [Fact]
    public void Question_no_op_update_does_not_touch_timestamp()
    {
        var question = CreateQuestion(QuestionType.MultipleChoiceSingle, 1m);

        var changed = question.UpdateDetails(
            question.Type,
            question.Prompt,
            question.Explanation,
            question.Points);

        Assert.False(changed);
        Assert.Null(question.UpdatedAtUtc);
    }

    [Fact]
    public void Question_type_change_applies_new_group_points()
    {
        var question = CreateQuestion(QuestionType.FillBlank, 1m);

        Assert.True(question.UpdateDetails(QuestionType.Group, "Group", null, 0m));
        Assert.Equal(QuestionType.Group, question.Type);
        Assert.Equal(0m, question.Points);
    }

    [Fact]
    public void Option_normalizes_and_mutates_idempotently()
    {
        var option = new QuestionOption(
            Guid.NewGuid(),
            "  Option text  ",
            " A ",
            false,
            " Explanation ",
            0);

        Assert.Equal("Option text", option.Text);
        Assert.Equal("A", option.Label);
        Assert.False(option.UpdateDetails(
            option.Text,
            option.Label,
            option.IsCorrect,
            option.Explanation));
        Assert.Null(option.UpdatedAtUtc);
        Assert.True(option.UpdateDetails("Changed", null, true, null));
        Assert.NotNull(option.UpdatedAtUtc);
    }

    [Fact]
    public void Draft_option_and_fill_answer_fields_allow_empty_content()
    {
        var option = new QuestionOption(Guid.NewGuid(), " ", " ", false, " ", 0);
        var answer = new FillAnswerKey(Guid.NewGuid(), " ", false, 0);

        Assert.Equal(string.Empty, option.Text);
        Assert.Equal(string.Empty, option.Label);
        Assert.Equal(string.Empty, option.Explanation);
        Assert.Equal(string.Empty, answer.AcceptedAnswer);
        Assert.StartsWith("__draft__:", answer.NormalizedAnswer, StringComparison.Ordinal);
    }

    [Fact]
    public void Fill_answer_normalizer_handles_unicode_whitespace_and_case()
    {
        Assert.Equal("STRAßE VALUE", FillAnswerNormalizer.Normalize(
            "  Straße\tvalue  ",
            caseSensitive: false));
        Assert.Equal("Å", FillAnswerNormalizer.Normalize(
            " A\u030A ",
            caseSensitive: true));
    }

    [Theory]
    [InlineData("Answer", false, "answer", true, true)]
    [InlineData("Answer", true, "answer", true, false)]
    [InlineData(" A  B ", true, "A B", true, true)]
    public void Fill_answer_conflict_semantics_are_deterministic(
        string first,
        bool firstSensitive,
        string second,
        bool secondSensitive,
        bool expected)
    {
        Assert.Equal(expected, FillAnswerNormalizer.Conflicts(
            first,
            firstSensitive,
            second,
            secondSensitive));
    }

    [Fact]
    public void Fill_answer_key_recomputes_normalized_value_and_preserves_no_op_timestamp()
    {
        var key = new FillAnswerKey(Guid.NewGuid(), "  Answer  ", false, 0);

        Assert.Equal(FillAnswerKeyConstraints.DefaultBlankKey, key.BlankKey);
        Assert.Equal("ANSWER", key.NormalizedAnswer);
        Assert.False(key.Update("Answer", false));
        Assert.Null(key.UpdatedAtUtc);
        Assert.True(key.Update("Answer", true));
        Assert.Equal("Answer", key.NormalizedAnswer);
        Assert.NotNull(key.UpdatedAtUtc);
    }

    [Fact]
    public void Version_total_score_is_draft_only_nonnegative_and_idempotent()
    {
        var version = new ExamVersion(
            Guid.NewGuid(), 1, "Version", null, null, null, Guid.NewGuid());

        Assert.True(version.UpdateTotalScore(3.5m));
        var updatedAt = version.UpdatedAtUtc;
        Assert.False(version.UpdateTotalScore(3.5m));
        Assert.Equal(updatedAt, version.UpdatedAtUtc);
        Assert.Throws<ArgumentOutOfRangeException>(() => version.UpdateTotalScore(-1m));
        version.Publish(DateTimeOffset.UtcNow);
        Assert.Throws<InvalidOperationException>(() => version.UpdateTotalScore(4m));
    }

    [Fact]
    public void Version_initial_score_does_not_mark_new_clone_as_updated()
    {
        var version = new ExamVersion(
            Guid.NewGuid(), 1, "Version", null, null, null, Guid.NewGuid());

        version.InitializeTotalScore(2.5m);

        Assert.Equal(2.5m, version.TotalScore);
        Assert.Null(version.UpdatedAtUtc);
        Assert.Throws<InvalidOperationException>(() => version.InitializeTotalScore(3m));
    }

    private static Question CreateQuestion(QuestionType type, decimal points) =>
        new(Guid.NewGuid(), null, type, "Question", null, points, 0);
}