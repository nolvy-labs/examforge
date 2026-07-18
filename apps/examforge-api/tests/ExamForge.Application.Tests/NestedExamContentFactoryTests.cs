using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Application.Admin.Exams.Utils;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class NestedExamContentFactoryTests
{
    private readonly NestedExamContentFactory _factory = new();

    [Fact]
    public void Null_and_empty_sections_create_equivalent_empty_graphs()
    {
        var nullResult = _factory.Create(Guid.NewGuid(), null);
        var emptyResult = _factory.Create(Guid.NewGuid(), []);

        Assert.True(nullResult.IsSuccess);
        Assert.True(emptyResult.IsSuccess);
        Assert.Empty(nullResult.Value!.Sections);
        Assert.Empty(emptyResult.Value!.Sections);
        Assert.Equal(0m, nullResult.Value.TotalScore);
    }

    [Fact]
    public void Complete_graph_assigns_contiguous_orders_ids_and_total_score()
    {
        var input = new[]
        {
            Section("First",
                Question(QuestionType.MultipleChoiceSingle, "Choice", 2m,
                    options:
                    [
                        new(" A ", "A", true),
                        new(" B ", "B")
                    ]),
                Question(QuestionType.Group, "Group", 0m,
                    children:
                    [
                        Child(QuestionType.FillBlank, "Blank", 3m,
                            answers: [new(" answer "), new("response", true)]),
                        Child(QuestionType.MultipleChoiceMultiple, "Multiple", 4m,
                            options: [new("One", IsCorrect: true), new("Two")])
                    ])),
            Section("Second")
        };

        var result = _factory.Create(Guid.NewGuid(), input);

        Assert.True(result.IsSuccess);
        var graph = result.Value!;
        Assert.Equal(new[] { 0, 1 }, graph.Sections.Select(section => section.DisplayOrder));
        Assert.Equal(new[] { 0, 1 }, graph.SectionResponses[0].Questions!.Select(question => question.DisplayOrder));
        var group = graph.SectionResponses[0].Questions![1];
        var childQuestions = group.ChildQuestions!;
        Assert.Equal(new[] { 0, 1 }, childQuestions.Select(question => question.DisplayOrder));
        Assert.All(childQuestions, child => Assert.Equal(group.Id, child.ParentQuestionId));
        Assert.Equal(new[] { 0, 1 }, graph.Options.Take(2).Select(option => option.DisplayOrder));
        Assert.Equal(new[] { 0, 1 }, graph.AnswerKeys.Select(key => key.DisplayOrder));
        Assert.Equal(9m, graph.TotalScore);
        Assert.Equal(4, graph.SectionResponses[0].QuestionCount);
        Assert.All(graph.Questions, question => Assert.NotEqual(Guid.Empty, question.Id));
    }

    [Fact]
    public void Single_choice_with_multiple_correct_options_has_path_aware_error()
    {
        var result = _factory.Create(Guid.NewGuid(),
        [
            Section("Section", Question(QuestionType.MultipleChoiceSingle, "Question", 1m,
                options: [new("A", IsCorrect: true), new("B", IsCorrect: true)]))
        ]);

        var error = Assert.Single(result.Error);
        Assert.Equal("sections[0].questions[0].options", error.Path);
        Assert.Equal("multiple_correct_options", error.Code);
    }

    [Fact]
    public void Duplicate_fill_answers_use_case_sensitivity_conflict_semantics()
    {
        var result = _factory.Create(Guid.NewGuid(),
        [
            Section("Section", Question(QuestionType.FillBlank, "Question", 1m,
                answers: [new("  Hello   World  ", true), new("hello world")]))
        ]);

        Assert.Contains(result.Error, error =>
            error.Path == "sections[0].questions[0].answerKeys[1].acceptedAnswer" &&
            error.Code == "duplicate_accepted_answer");
    }

    [Theory]
    [InlineData(QuestionType.Group, true, false, "options")]
    [InlineData(QuestionType.Group, false, true, "answerKeys")]
    [InlineData(QuestionType.FillBlank, true, false, "options")]
    [InlineData(QuestionType.MultipleChoiceMultiple, false, true, "answerKeys")]
    public void Incompatible_content_is_rejected(
        QuestionType type, bool includeOptions, bool includeAnswers, string property)
    {
        var result = _factory.Create(Guid.NewGuid(),
        [
            Section("Section", Question(type, "Question", type == QuestionType.Group ? 0m : 1m,
                options: includeOptions ? [new("A")] : null,
                answers: includeAnswers ? [new("A")] : null))
        ]);

        Assert.Contains(result.Error, error => error.Path.EndsWith(property, StringComparison.Ordinal));
    }

    [Fact]
    public void Child_group_is_rejected_at_type_path()
    {
        var result = _factory.Create(Guid.NewGuid(),
        [
            Section("Section", Question(QuestionType.Group, "Group", 0m,
                children: [Child(QuestionType.Group, "Nested", 0m)]))
        ]);

        Assert.Contains(result.Error, error =>
            error.Path == "sections[0].questions[0].childQuestions[0].detail.type" &&
            error.Code == "nested_group");
    }

    [Fact]
    public void Route_parent_cannot_submit_child_questions()
    {
        var input = Question(QuestionType.Group, "Group", 0m,
            children: [Child(QuestionType.FillBlank, "Child", 1m)]);

        var result = _factory.CreateQuestion(Guid.NewGuid(), Guid.NewGuid(), input, 7);

        Assert.Contains(result.Error, error => error.Code == "parent_question_cannot_have_children");
    }

    [Fact]
    public void Draft_leaf_content_can_be_empty()
    {
        foreach (var type in new[] { QuestionType.MultipleChoiceSingle, QuestionType.MultipleChoiceMultiple, QuestionType.FillBlank })
        {
            var result = _factory.CreateQuestion(Guid.NewGuid(), null, Question(type, "Draft", 1m), 0);
            Assert.True(result.IsSuccess);
            Assert.False(NestedExamContentFactory.ToResponse(result.Value!).IsComplete);
        }
    }

    [Fact]
    public void Limits_are_checked_before_graph_construction()
    {
        var sections = Enumerable.Range(0, NestedContentLimits.MaximumSectionsPerVersion + 1)
            .Select(index => Section($"Section {index}"))
            .ToList();

        var result = _factory.Create(Guid.NewGuid(), sections);

        var error = Assert.Single(result.Error);
        Assert.Equal("too_many_sections", error.Code);
        Assert.Empty(result.Value?.Sections ?? []);
    }

    private static CreateExamSectionInput Section(string title, params CreateQuestionInput[] questions) =>
        new(new CreateExamSectionDetail(title), questions);

    private static CreateQuestionInput Question(
        QuestionType type,
        string prompt,
        decimal points,
        IReadOnlyList<CreateChildQuestionInput>? children = null,
        IReadOnlyList<CreateQuestionOptionDetail>? options = null,
        IReadOnlyList<CreateFillAnswerKeyInput>? answers = null) =>
        new(new CreateQuestionDetail(type, prompt, Points: points), children, options, answers);

    private static CreateChildQuestionInput Child(
        QuestionType type,
        string prompt,
        decimal points,
        IReadOnlyList<CreateQuestionOptionDetail>? options = null,
        IReadOnlyList<CreateFillAnswerKeyInput>? answers = null) =>
        new(new CreateQuestionDetail(type, prompt, Points: points), options, answers);
}