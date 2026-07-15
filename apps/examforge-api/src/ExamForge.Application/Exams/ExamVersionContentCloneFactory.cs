using ExamForge.Domain.Exams;

namespace ExamForge.Application.Exams;

public sealed record CloneOptionSource(
    Guid Id,
    string Text,
    string? Label,
    bool IsCorrect,
    string? Explanation,
    int DisplayOrder);

public sealed record CloneAnswerKeySource(
    Guid Id,
    string AcceptedAnswer,
    string NormalizedAnswer,
    bool IsCaseSensitive,
    int DisplayOrder);

public sealed record CloneQuestionSource(
    Guid Id,
    Guid? ParentQuestionId,
    QuestionType Type,
    string Prompt,
    string? Explanation,
    decimal Points,
    int DisplayOrder,
    string? MetadataJson,
    IReadOnlyCollection<CloneOptionSource> Options,
    IReadOnlyCollection<CloneAnswerKeySource> AnswerKeys);

public sealed record CloneSectionSource(
    Guid Id,
    ExamSectionKind Kind,
    string Title,
    string Instructions,
    string? StimulusText,
    string? MediaUrl,
    int DisplayOrder,
    string? MetadataJson,
    IReadOnlyCollection<CloneQuestionSource> Questions);

public sealed record ExamVersionContentClonePlan(
    IReadOnlyCollection<ExamSection> Sections,
    IReadOnlyCollection<Question> Questions,
    IReadOnlyCollection<QuestionOption> Options,
    IReadOnlyCollection<FillAnswerKey> AnswerKeys,
    decimal TotalScore);

public static class ExamVersionContentCloneFactory
{
    public static ExamVersionContentClonePlan Create(
        Guid targetVersionId,
        IReadOnlyCollection<CloneSectionSource> sourceSections)
    {
        var sections = new List<ExamSection>();
        var questions = new List<Question>();
        var options = new List<QuestionOption>();
        var answerKeys = new List<FillAnswerKey>();
        var questionIds = new Dictionary<Guid, Guid>();

        foreach (var sourceSection in sourceSections
                     .OrderBy(section => section.DisplayOrder)
                     .ThenBy(section => section.Id))
        {
            var section = new ExamSection(
                targetVersionId,
                sourceSection.Kind,
                sourceSection.Title,
                sourceSection.Instructions,
                sourceSection.StimulusText,
                sourceSection.MediaUrl,
                sourceSection.DisplayOrder,
                sourceSection.MetadataJson);
            sections.Add(section);

            foreach (var sourceQuestion in sourceSection.Questions
                         .OrderBy(question => question.ParentQuestionId.HasValue ? 1 : 0)
                         .ThenBy(question => question.DisplayOrder)
                         .ThenBy(question => question.Id))
            {
                Guid? parentId = sourceQuestion.ParentQuestionId.HasValue
                    ? questionIds[sourceQuestion.ParentQuestionId.Value]
                    : null;
                var question = new Question(
                    section.Id,
                    parentId,
                    sourceQuestion.Type,
                    sourceQuestion.Prompt,
                    sourceQuestion.Explanation,
                    sourceQuestion.Points,
                    sourceQuestion.DisplayOrder,
                    sourceQuestion.MetadataJson);
                questionIds[sourceQuestion.Id] = question.Id;
                questions.Add(question);

                options.AddRange(sourceQuestion.Options
                    .OrderBy(option => option.DisplayOrder)
                    .ThenBy(option => option.Id)
                    .Select(option => new QuestionOption(
                        question.Id,
                        option.Text,
                        option.Label,
                        option.IsCorrect,
                        option.Explanation,
                        option.DisplayOrder)));
                answerKeys.AddRange(sourceQuestion.AnswerKeys
                    .OrderBy(key => key.DisplayOrder)
                    .ThenBy(key => key.Id)
                    .Select(key => FillAnswerKey.CreateClone(
                        question.Id,
                        key.AcceptedAnswer,
                        key.NormalizedAnswer,
                        key.IsCaseSensitive,
                        key.DisplayOrder)));
            }
        }

        return new ExamVersionContentClonePlan(
            sections,
            questions,
            options,
            answerKeys,
            questions.Where(question => question.Type != QuestionType.Group).Sum(question => question.Points));
    }
}
