using ExamForge.Application.Exams;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class ExamVersionPublicationReadinessTests
{
    [Fact]
    public void Empty_version_or_section_is_not_ready()
    {
        Assert.False(ExamVersionPublicationReadiness.IsReady(0m, []));
        Assert.False(ExamVersionPublicationReadiness.IsReady(
            0m,
            [new PublicationSectionState([])]));
    }

    [Fact]
    public void Empty_group_is_not_ready()
    {
        Assert.False(IsReady(0m, Question(QuestionType.Group, points: 0m)));
    }

    [Theory]
    [InlineData(QuestionType.FillBlank, 0, 0, 0)]
    [InlineData(QuestionType.MultipleChoiceSingle, 1, 1, 0)]
    [InlineData(QuestionType.MultipleChoiceSingle, 2, 0, 0)]
    [InlineData(QuestionType.MultipleChoiceMultiple, 2, 0, 0)]
    public void Incomplete_answers_are_not_ready(
        QuestionType type,
        int optionCount,
        int correctCount,
        int keyCount)
    {
        Assert.False(IsReady(1m, Question(
            type,
            optionCount: optionCount,
            correctCount: correctCount,
            keyCount: keyCount)));
    }

    [Fact]
    public void Valid_mixed_content_is_ready()
    {
        var groupId = Guid.NewGuid();
        var questions = new[]
        {
            Question(QuestionType.Group, id: groupId, points: 0m),
            Question(QuestionType.FillBlank, parentId: groupId, keyCount: 2, points: 1.5m),
            Question(QuestionType.MultipleChoiceSingle, optionCount: 2, correctCount: 1, points: 2m),
            Question(QuestionType.MultipleChoiceMultiple, optionCount: 3, correctCount: 2, points: 3m)
        };

        Assert.True(IsReady(6.5m, questions));
    }

    [Fact]
    public void Total_mismatch_is_not_ready()
    {
        Assert.False(IsReady(2m, Question(QuestionType.FillBlank, keyCount: 1, points: 1m)));
    }

    [Fact]
    public void Incompatible_content_is_not_ready()
    {
        Assert.False(IsReady(1m, Question(
            QuestionType.FillBlank,
            optionCount: 1,
            keyCount: 1)));
    }

    private static bool IsReady(decimal total, params PublicationQuestionState[] questions) =>
        ExamVersionPublicationReadiness.IsReady(
            total,
            [new PublicationSectionState(questions)]);

    private static PublicationQuestionState Question(
        QuestionType type,
        Guid? id = null,
        Guid? parentId = null,
        decimal points = 1m,
        int optionCount = 0,
        int correctCount = 0,
        int keyCount = 0) =>
        new(
            id ?? Guid.NewGuid(),
            parentId,
            type,
            points,
            optionCount,
            correctCount,
            keyCount);
}
