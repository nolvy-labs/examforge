using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Application.Admin.Exams.Services;
using ExamForge.Application.Admin.Exams.Utils;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class ExamVersionContentCloneFactoryTests
{
    [Fact]
    public void Empty_content_produces_empty_zero_score_plan()
    {
        var plan = ExamVersionContentCloneFactory.Create(Guid.NewGuid(), []);

        Assert.Empty(plan.Sections);
        Assert.Empty(plan.Questions);
        Assert.Empty(plan.Options);
        Assert.Empty(plan.AnswerKeys);
        Assert.Equal(0m, plan.TotalScore);
    }

    [Fact]
    public void Complete_hierarchy_gets_new_ids_remapped_parent_and_preserved_content()
    {
        var sourceSectionId = Guid.NewGuid();
        var sourceGroupId = Guid.NewGuid();
        var sourceChildId = Guid.NewGuid();
        var sourceChoiceId = Guid.NewGuid();
        var source = new CloneSectionSource(
            sourceSectionId,
            ExamSectionKind.Reading,
            "Section",
            "Instructions",
            "Stimulus",
            null,
            3,
            "{\"section\":true}",
            [
                new CloneQuestionSource(
                    sourceGroupId, null, QuestionType.Group, "Group", null, 0m, 0,
                    "{\"group\":true}", [], []),
                new CloneQuestionSource(
                    sourceChildId, sourceGroupId, QuestionType.FillBlank, "Fill", "Why", 1.5m, 0,
                    null, [], [new CloneAnswerKeySource(Guid.NewGuid(), "Answer", "ANSWER", false, 0)]),
                new CloneQuestionSource(
                    sourceChoiceId, null, QuestionType.MultipleChoiceSingle, "Choose", null, 2m, 1,
                    null,
                    [
                        new CloneOptionSource(Guid.NewGuid(), "A", "A", true, null, 0),
                        new CloneOptionSource(Guid.NewGuid(), "B", "B", false, null, 1)
                    ],
                    [])
            ]);
        var targetVersionId = Guid.NewGuid();

        var plan = ExamVersionContentCloneFactory.Create(targetVersionId, [source]);

        var section = Assert.Single(plan.Sections);
        Assert.NotEqual(sourceSectionId, section.Id);
        Assert.Equal(targetVersionId, section.ExamVersionId);
        Assert.Equal(3, section.DisplayOrder);
        Assert.Equal("{\"section\":true}", section.MetadataJson);
        Assert.All(plan.Questions, question => Assert.DoesNotContain(
            question.Id,
            new[] { sourceGroupId, sourceChildId, sourceChoiceId }));
        var group = plan.Questions.Single(question => question.Type == QuestionType.Group);
        var child = plan.Questions.Single(question => question.Type == QuestionType.FillBlank);
        Assert.Equal(group.Id, child.ParentQuestionId);
        Assert.Equal(0, child.DisplayOrder);
        var answerKey = Assert.Single(plan.AnswerKeys);
        Assert.Equal("Answer", answerKey.AcceptedAnswer);
        Assert.Equal("ANSWER", answerKey.NormalizedAnswer);
        Assert.Equal(2, plan.Options.Count);
        Assert.Single(plan.Options, option => option.IsCorrect);
        Assert.Equal(3.5m, plan.TotalScore);
        Assert.All(plan.Questions, question => Assert.Null(question.UpdatedAtUtc));
        Assert.All(plan.Options, option => Assert.Null(option.UpdatedAtUtc));
        Assert.All(plan.AnswerKeys, key => Assert.Null(key.UpdatedAtUtc));
    }
}
