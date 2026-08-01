using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Application.Common;
using ExamForge.Domain.Common;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Utils;

public static class NestedContentLimits
{
    public const int MaximumSectionsPerVersion = 100;
    public const int MaximumQuestionsPerSection = 500;
    public const int MaximumQuestionsPerRequest = 2000;
    public const int MaximumChildQuestionsPerGroup = 200;
    public const int MaximumOptionsPerQuestion = 20;
    public const int MaximumAnswerKeysPerQuestion = 20;
}

public sealed record CreatedExamContentGraph(
    IReadOnlyList<ExamSection> Sections,
    IReadOnlyList<Question> Questions,
    IReadOnlyList<QuestionOption> Options,
    IReadOnlyList<FillAnswerKey> AnswerKeys,
    IReadOnlyList<ExamSectionDetailResponse> SectionResponses,
    decimal TotalScore);

public sealed class NestedExamContentFactory
{
    public static IReadOnlyList<ExamSectionDetailResponse> ToResponses(ExamVersionContentClonePlan plan)
    {
        return plan.Sections.OrderBy(section => section.DisplayOrder).Select(section =>
        {
            var sectionQuestions = plan.Questions.Where(question => question.ExamSectionId == section.Id).ToList();
            var topLevel = sectionQuestions.Where(question => !question.ParentQuestionId.HasValue)
                .OrderBy(question => question.DisplayOrder)
                .Select(question => BuildResponseGraph(question, sectionQuestions, plan.Options, plan.AnswerKeys))
                .Select(ToResponse).ToList();
            return ToResponse(section, topLevel);
        }).ToList();
    }

    public Result<CreatedExamContentGraph, IReadOnlyList<NestedContentValidationError>> Create(
        Guid versionId,
        IReadOnlyList<CreateExamSectionInput>? inputs,
        string path = "sections")
    {
        var sections = inputs ?? [];
        var errors = new List<NestedContentValidationError>();
        if (sections.Count > NestedContentLimits.MaximumSectionsPerVersion)
        {
            errors.Add(Error(path, "too_many_sections", $"At most {NestedContentLimits.MaximumSectionsPerVersion} sections are allowed."));
            return Failure(errors);
        }

        var totalQuestions = sections.Sum(section =>
            (section.Questions?.Count ?? 0) +
            (section.Questions?.Sum(question => question.ChildQuestions?.Count ?? 0) ?? 0));
        if (totalQuestions > NestedContentLimits.MaximumQuestionsPerRequest)
        {
            errors.Add(Error(path, "too_many_questions", $"At most {NestedContentLimits.MaximumQuestionsPerRequest} questions are allowed."));
            return Failure(errors);
        }

        var builtSections = new List<ExamSection>(sections.Count);
        var questions = new List<Question>(totalQuestions);
        var options = new List<QuestionOption>();
        var answerKeys = new List<FillAnswerKey>();
        var sectionResponses = new List<ExamSectionDetailResponse>(sections.Count);

        for (var sectionIndex = 0; sectionIndex < sections.Count; sectionIndex++)
        {
            var input = sections[sectionIndex];
            var sectionPath = $"{path}[{sectionIndex}]";
            if (!ValidateSection(input.Detail, $"{sectionPath}.detail", errors))
            {
                continue;
            }

            var sectionQuestions = input.Questions ?? [];
            if (sectionQuestions.Count > NestedContentLimits.MaximumQuestionsPerSection)
            {
                errors.Add(Error($"{sectionPath}.questions", "too_many_questions", $"At most {NestedContentLimits.MaximumQuestionsPerSection} top-level questions are allowed per section."));
                continue;
            }

            var section = new ExamSection(versionId, input.Detail.Kind, input.Detail.Title,
                input.Detail.Instructions, input.Detail.StimulusText, input.Detail.MediaUrl, sectionIndex);
            builtSections.Add(section);
            var responseQuestions = new List<QuestionDetailResponse>(sectionQuestions.Count);

            for (var questionIndex = 0; questionIndex < sectionQuestions.Count; questionIndex++)
            {
                var built = BuildQuestion(section.Id, null, sectionQuestions[questionIndex], questionIndex,
                    $"{sectionPath}.questions[{questionIndex}]", allowChildren: true, errors);
                if (built is null)
                {
                    continue;
                }

                var nodes = Flatten(built).ToList();
                questions.AddRange(nodes.Select(node => node.Question));
                options.AddRange(nodes.SelectMany(node => node.Options));
                answerKeys.AddRange(nodes.SelectMany(node => node.AnswerKeys));
                responseQuestions.Add(ToResponse(built));
            }

            sectionResponses.Add(ToResponse(section, responseQuestions));
        }

        if (errors.Count > 0)
        {
            return Failure(errors);
        }

        return Result<CreatedExamContentGraph, IReadOnlyList<NestedContentValidationError>>.Success(
            new CreatedExamContentGraph(builtSections, questions, options, answerKeys, sectionResponses,
                questions.Where(question => question.Type != QuestionType.Group).Sum(question => question.Points)));
    }

    public Result<CreatedQuestionGraph, IReadOnlyList<NestedContentValidationError>> CreateQuestion(
        Guid sectionId,
        Guid? parentQuestionId,
        CreateQuestionInput input,
        int displayOrder,
        string path = "question")
    {
        var errors = new List<NestedContentValidationError>();
        if (parentQuestionId.HasValue && (input.ChildQuestions?.Count ?? 0) > 0)
        {
            errors.Add(Error($"{path}.childQuestions", "parent_question_cannot_have_children", "A route-level child question cannot submit child questions."));
        }

        var built = BuildQuestion(sectionId, parentQuestionId, input, displayOrder, path,
            allowChildren: !parentQuestionId.HasValue, errors);
        return errors.Count > 0 || built is null
            ? Result<CreatedQuestionGraph, IReadOnlyList<NestedContentValidationError>>.Failure(errors)
            : Result<CreatedQuestionGraph, IReadOnlyList<NestedContentValidationError>>.Success(built);
    }

    private static CreatedQuestionGraph? BuildQuestion(
        Guid sectionId, Guid? parentQuestionId, CreateQuestionInput input, int displayOrder,
        string path, bool allowChildren, List<NestedContentValidationError> errors)
    {
        var childInputs = input.ChildQuestions ?? [];
        var optionInputs = input.Options ?? [];
        var answerInputs = input.AnswerKeys ?? [];
        if (childInputs.Count > NestedContentLimits.MaximumChildQuestionsPerGroup)
            errors.Add(Error($"{path}.childQuestions", "too_many_child_questions", $"At most {NestedContentLimits.MaximumChildQuestionsPerGroup} child questions are allowed."));
        if (optionInputs.Count > NestedContentLimits.MaximumOptionsPerQuestion)
            errors.Add(Error($"{path}.options", "too_many_options", $"At most {NestedContentLimits.MaximumOptionsPerQuestion} options are allowed."));
        if (answerInputs.Count > NestedContentLimits.MaximumAnswerKeysPerQuestion)
            errors.Add(Error($"{path}.answerKeys", "too_many_answer_keys", $"At most {NestedContentLimits.MaximumAnswerKeysPerQuestion} answer keys are allowed."));

        var type = input.Detail.Type;
        if (type == QuestionType.Group)
        {
            if (parentQuestionId.HasValue)
                errors.Add(Error($"{path}.detail.type", "nested_group", "A child question cannot be a Group."));
            if (!allowChildren && childInputs.Count > 0)
                errors.Add(Error($"{path}.childQuestions", "child_questions_not_allowed", "Child questions are not allowed here."));
            if (optionInputs.Count > 0)
                errors.Add(Error($"{path}.options", "incompatible_content", "Group questions cannot contain options."));
            if (answerInputs.Count > 0)
                errors.Add(Error($"{path}.answerKeys", "incompatible_content", "Group questions cannot contain answer keys."));
        }
        else
        {
            if (childInputs.Count > 0)
                errors.Add(Error($"{path}.childQuestions", "incompatible_content", "Only Group questions can contain child questions."));
            if (type == QuestionType.FillBlank && optionInputs.Count > 0)
                errors.Add(Error($"{path}.options", "incompatible_content", "FillBlank questions cannot contain options."));
            if (type is QuestionType.MultipleChoiceSingle or QuestionType.MultipleChoiceMultiple && answerInputs.Count > 0)
                errors.Add(Error($"{path}.answerKeys", "incompatible_content", "Multiple-choice questions cannot contain answer keys."));
            if (type is not (QuestionType.MultipleChoiceSingle or QuestionType.MultipleChoiceMultiple) && optionInputs.Count > 0)
                errors.Add(Error($"{path}.options", "incompatible_content", "This question type cannot contain options."));
            if (type != QuestionType.FillBlank && answerInputs.Count > 0)
                errors.Add(Error($"{path}.answerKeys", "incompatible_content", "This question type cannot contain answer keys."));
        }

        if (type == QuestionType.MultipleChoiceSingle && optionInputs.Count(option => option.IsCorrect) > 1)
            errors.Add(Error($"{path}.options", "multiple_correct_options", "A single-choice question cannot contain multiple correct options."));

        var points = input.Detail.Points ?? (type == QuestionType.Group ? 0m : 1m);
        ValidateQuestionDetail(input.Detail, points, $"{path}.detail", errors);
        ValidateOptions(optionInputs, $"{path}.options", errors);
        ValidateAnswers(answerInputs, $"{path}.answerKeys", errors);
        if (errors.Count > 0)
            return null;

        var question = new Question(sectionId, parentQuestionId, type, input.Detail.Prompt,
            input.Detail.Explanation, points, displayOrder);
        var options = optionInputs.Select((option, index) => new QuestionOption(question.Id, option.Text,
            option.Label, option.IsCorrect, option.Explanation, index)).ToList();
        var answers = answerInputs.Select((answer, index) => new FillAnswerKey(question.Id,
            answer.AcceptedAnswer, answer.IsCaseSensitive, index)).ToList();
        var children = new List<CreatedQuestionGraph>(childInputs.Count);
        for (var index = 0; index < childInputs.Count; index++)
        {
            var child = childInputs[index];
            var childInput = new CreateQuestionInput(child.Detail, null, child.Options, child.AnswerKeys);
            var builtChild = BuildQuestion(sectionId, question.Id, childInput, index,
                $"{path}.childQuestions[{index}]", allowChildren: false, errors);
            if (builtChild is not null)
                children.Add(builtChild);
        }

        return errors.Count == 0 ? new CreatedQuestionGraph(question, children, options, answers) : null;
    }

    private static bool ValidateSection(CreateExamSectionDetail? detail, string path, List<NestedContentValidationError> errors)
    {
        if (detail is null) { errors.Add(Error(path, "required", "Section detail is required.")); return false; }
        if (!Enum.IsDefined(detail.Kind)) errors.Add(Error($"{path}.kind", "invalid_kind", "Section kind is invalid."));
        if (!string.IsNullOrWhiteSpace(detail.Title) &&
            TextNormalizer.NormalizeName(detail.Title).Length > ExamSectionConstraints.TitleMaxLength)
            errors.Add(Error($"{path}.title", "invalid_title", "Section title is invalid."));
        if (detail.Instructions is not null && detail.Instructions.Trim().Length > ExamSectionConstraints.InstructionsMaxLength)
            errors.Add(Error($"{path}.instructions", "invalid_instructions", "Section instructions are invalid."));
        if (detail.StimulusText?.Trim().Length > ExamSectionConstraints.StimulusTextMaxLength)
            errors.Add(Error($"{path}.stimulusText", "invalid_stimulus_text", "Section stimulus text is invalid."));
        if (detail.MediaUrl?.Trim().Length > ExamSectionConstraints.MediaUrlMaxLength)
            errors.Add(Error($"{path}.mediaUrl", "invalid_media_url", "Section media URL is invalid."));
        return errors.Count == 0;
    }

    private static void ValidateQuestionDetail(CreateQuestionDetail detail, decimal points, string path, List<NestedContentValidationError> errors)
    {
        if (!Enum.IsDefined(detail.Type)) errors.Add(Error($"{path}.type", "invalid_type", "Question type is invalid."));
        if (!string.IsNullOrWhiteSpace(detail.Prompt) &&
            TextNormalizer.NormalizeName(detail.Prompt).Length > QuestionConstraints.PromptMaxLength)
            errors.Add(Error($"{path}.prompt", "invalid_prompt", "Question prompt is invalid."));
        if (detail.Explanation?.Trim().Length > QuestionConstraints.ExplanationMaxLength)
            errors.Add(Error($"{path}.explanation", "invalid_explanation", "Question explanation is invalid."));
        var validPoints = detail.Type == QuestionType.Group ? points == 0m : points is >= 0m and <= QuestionConstraints.MaxPoints && decimal.Round(points, QuestionConstraints.PointsScale) == points;
        if (!validPoints) errors.Add(Error($"{path}.points", "invalid_points", "Question points are invalid."));
    }

    private static void ValidateOptions(IReadOnlyList<CreateQuestionOptionDetail> options, string path, List<NestedContentValidationError> errors)
    {
        for (var index = 0; index < options.Count; index++)
        {
            var option = options[index];
            if ((option.Text?.Trim().Length ?? 0) > QuestionOptionConstraints.TextMaxLength)
                errors.Add(Error($"{path}[{index}].text", "invalid_option_text", "Question option text is invalid."));
            if (option.Label?.Trim().Length > QuestionOptionConstraints.LabelMaxLength)
                errors.Add(Error($"{path}[{index}].label", "invalid_option_label", "Question option label is invalid."));
            if (option.Explanation?.Trim().Length > QuestionOptionConstraints.ExplanationMaxLength)
                errors.Add(Error($"{path}[{index}].explanation", "invalid_option_explanation", "Question option explanation is invalid."));
        }
    }

    private static void ValidateAnswers(IReadOnlyList<CreateFillAnswerKeyInput> answers, string path, List<NestedContentValidationError> errors)
    {
        for (var index = 0; index < answers.Count; index++)
        {
            var answer = answers[index];
            if (FillAnswerNormalizer.Normalize(answer.AcceptedAnswer ?? string.Empty, true).Length > FillAnswerKeyConstraints.AcceptedAnswerMaxLength)
                errors.Add(Error($"{path}[{index}].acceptedAnswer", "invalid_accepted_answer", "Accepted answer is invalid."));
            for (var other = 0; other < index; other++)
                if (!string.IsNullOrWhiteSpace(answer.AcceptedAnswer) && !string.IsNullOrWhiteSpace(answers[other].AcceptedAnswer) && FillAnswerNormalizer.Conflicts(answer.AcceptedAnswer, answer.IsCaseSensitive, answers[other].AcceptedAnswer, answers[other].IsCaseSensitive))
                { errors.Add(Error($"{path}[{index}].acceptedAnswer", "duplicate_accepted_answer", "Accepted answer duplicates another normalized answer.")); break; }
        }
    }

    public static QuestionDetailResponse ToResponse(CreatedQuestionGraph graph)
    {
        var question = graph.Question;
        var children = graph.Children.Select(ToResponse).ToList();
        var options = graph.Options.Select(option => new QuestionOptionResponse(option.Id, option.QuestionId,
            option.Label, option.Text, option.IsCorrect, option.DisplayOrder, option.Explanation,
            option.CreatedAtUtc, option.UpdatedAtUtc)).ToList();
        var answers = graph.AnswerKeys.Select(key => new FillAnswerKeyResponse(key.Id, key.QuestionId,
            key.BlankKey, key.AcceptedAnswer, key.IsCaseSensitive, key.CreatedAtUtc, key.UpdatedAtUtc)).ToList();
        var complete = question.Type == QuestionType.Group ? children.Count > 0 : question.Type == QuestionType.FillBlank
            ? answers.Count > 0 : question.Type == QuestionType.MultipleChoiceSingle
                ? options.Count >= 2 && options.Count(option => option.IsCorrect) == 1
                : options.Count >= 2 && options.Any(option => option.IsCorrect);
        return new QuestionDetailResponse(question.Id, question.ExamSectionId, question.ParentQuestionId,
            question.Type, question.Prompt, question.Explanation, question.Points, question.DisplayOrder,
            children.Count, options.Count, answers.Count, complete, question.CreatedAtUtc, question.UpdatedAtUtc,
            options, answers, children);
    }

    public static ExamSectionDetailResponse ToResponse(ExamSection section, IReadOnlyList<QuestionDetailResponse> questions) =>
        new(section.Id, section.ExamVersionId, section.Kind, section.Title, section.DisplayOrder,
            questions.Sum(question => 1 + (question.ChildQuestions?.Count ?? 0)), questions.Sum(question => question.Type == QuestionType.Group
                ? question.ChildQuestions?.Sum(child => child.Points) ?? 0m : question.Points),
            section.CreatedAtUtc, section.UpdatedAtUtc, section.Instructions, section.StimulusText,
            section.MediaUrl, questions);

    private static NestedContentValidationError Error(string path, string code, string message) => new(path, code, message);
    private static Result<CreatedExamContentGraph, IReadOnlyList<NestedContentValidationError>> Failure(List<NestedContentValidationError> errors) =>
        Result<CreatedExamContentGraph, IReadOnlyList<NestedContentValidationError>>.Failure(errors);

    private static CreatedQuestionGraph BuildResponseGraph(
        Question question,
        IReadOnlyList<Question> questions,
        IReadOnlyCollection<QuestionOption> options,
        IReadOnlyCollection<FillAnswerKey> answerKeys) =>
        new(question,
            questions.Where(child => child.ParentQuestionId == question.Id)
                .OrderBy(child => child.DisplayOrder)
                .Select(child => BuildResponseGraph(child, questions, options, answerKeys)).ToList(),
            options.Where(option => option.QuestionId == question.Id).OrderBy(option => option.DisplayOrder).ToList(),
            answerKeys.Where(key => key.QuestionId == question.Id).OrderBy(key => key.DisplayOrder).ToList());

    private static IEnumerable<CreatedQuestionGraph> Flatten(CreatedQuestionGraph graph)
    {
        yield return graph;
        foreach (var child in graph.Children)
            foreach (var node in Flatten(child))
                yield return node;
    }
}

public sealed record CreatedQuestionGraph(
    Question Question,
    IReadOnlyList<CreatedQuestionGraph> Children,
    IReadOnlyList<QuestionOption> Options,
    IReadOnlyList<FillAnswerKey> AnswerKeys);