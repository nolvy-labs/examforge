using System.Reflection;

using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

internal static class ExamAttemptTestFactory
{
    public static ExamAttempt CreateAttempt(params Question[] questions)
        => CreateAttempt(ExamAttemptMode.Exam, questions);

    public static ExamAttempt CreateAttempt(
        ExamAttemptMode mode,
        params Question[] questions)
    {
        var studentId = Guid.NewGuid();
        var exam = new Exam("Exam", "exam", null, ExamType.Simple);
        var version = new ExamVersion(
            exam.Id,
            1,
            "Version",
            null,
            null,
            60,
            Guid.NewGuid());
        var section = new ExamSection(
            version.Id,
            ExamSectionKind.Default,
            "Section",
            null,
            null,
            null,
            0);
        AddToCollection(section, "_questions", questions);
        AddToCollection(version, "_sections", section);
        SetProperty(version, nameof(ExamVersion.Exam), exam);

        var attempt = new ExamAttempt(
            studentId,
            exam.Id,
            version.Id,
            mode,
            DateTimeOffset.Parse("2026-07-26T00:00:00Z"),
            mode == ExamAttemptMode.Exam
                ? DateTimeOffset.Parse("2026-07-26T01:00:00Z")
                : null,
            questions.Where(question => question.Type != QuestionType.Group)
                .Select(question => question.Id));
        WireAttempt(attempt, exam, version);

        return attempt;
    }

    public static void WireAttempt(
        ExamAttempt attempt,
        Exam exam,
        ExamVersion version)
    {
        SetProperty(attempt, nameof(ExamAttempt.Exam), exam);
        SetProperty(attempt, nameof(ExamAttempt.ExamVersion), version);

        var questionById = version.Sections
            .SelectMany(section => section.Questions)
            .ToDictionary(question => question.Id);
        foreach (var answer in attempt.Answers)
        {
            SetProperty(answer, nameof(ExamAttemptAnswer.Question), questionById[answer.QuestionId]);
        }
    }

    public static Question Question(
        QuestionType type,
        decimal points = 1m,
        Guid? parentQuestionId = null) =>
        new(
            Guid.NewGuid(),
            parentQuestionId,
            type,
            $"Prompt {Guid.NewGuid():N}",
            "Explanation",
            points,
            0);

    public static QuestionOption AddOption(
        Question question,
        bool correct,
        int displayOrder)
    {
        var option = new QuestionOption(
            question.Id,
            $"Option {displayOrder}",
            null,
            correct,
            $"Why {displayOrder}",
            displayOrder);
        AddToCollection(question, "_options", option);
        return option;
    }

    public static FillAnswerKey AddFillKey(
        Question question,
        string value,
        bool caseSensitive,
        int displayOrder = 0)
    {
        var key = new FillAnswerKey(question.Id, value, caseSensitive, displayOrder);
        AddToCollection(question, "_fillAnswerKeys", key);
        return key;
    }

    private static void AddToCollection<T>(
        object target,
        string fieldName,
        params T[] items)
    {
        var list = (ICollection<T>)target.GetType()
            .GetField(fieldName, BindingFlags.Instance | BindingFlags.NonPublic)!
            .GetValue(target)!;
        foreach (var item in items)
        {
            list.Add(item);
        }
    }

    private static void SetProperty<T>(
        object target,
        string propertyName,
        T value)
    {
        target.GetType()
            .GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public)!
            .SetValue(target, value);
    }
}