using ExamForge.Domain.Exams;

namespace ExamForge.Application.Exams;

public sealed record PublicationQuestionState(
    Guid Id,
    Guid? ParentQuestionId,
    QuestionType Type,
    decimal Points,
    int OptionCount,
    int CorrectOptionCount,
    int AnswerKeyCount);

public sealed record PublicationSectionState(
    IReadOnlyCollection<PublicationQuestionState> Questions);

public static class ExamVersionPublicationReadiness
{
    public static bool IsReady(
        decimal storedTotalScore,
        IReadOnlyCollection<PublicationSectionState> sections)
    {
        if (sections.Count == 0)
        {
            return false;
        }

        decimal calculatedTotal = 0m;

        foreach (var section in sections)
        {
            if (!section.Questions.Any(question => question.Type != QuestionType.Group))
            {
                return false;
            }

            foreach (var question in section.Questions)
            {
                var childCount = section.Questions.Count(child => child.ParentQuestionId == question.Id);

                if (question.ParentQuestionId.HasValue)
                {
                    var parent = section.Questions.SingleOrDefault(
                        item => item.Id == question.ParentQuestionId.Value);

                    if (parent?.Type != QuestionType.Group || question.Type == QuestionType.Group)
                    {
                        return false;
                    }
                }

                if (question.Type == QuestionType.Group)
                {
                    if (question.ParentQuestionId.HasValue ||
                        question.Points != 0m ||
                        childCount == 0 ||
                        question.OptionCount > 0 ||
                        question.AnswerKeyCount > 0)
                    {
                        return false;
                    }

                    continue;
                }

                if (childCount > 0 || !HasValidScore(question.Points))
                {
                    return false;
                }

                calculatedTotal += question.Points;

                if (!HasCompleteAnswers(question))
                {
                    return false;
                }
            }
        }

        return calculatedTotal > 0m && calculatedTotal == storedTotalScore;
    }

    private static bool HasCompleteAnswers(PublicationQuestionState question) =>
        question.Type switch
        {
            QuestionType.FillBlank => question.OptionCount == 0 && question.AnswerKeyCount > 0,
            QuestionType.MultipleChoiceSingle =>
                question.AnswerKeyCount == 0 && question.OptionCount >= 2 && question.CorrectOptionCount == 1,
            QuestionType.MultipleChoiceMultiple =>
                question.AnswerKeyCount == 0 && question.OptionCount >= 2 && question.CorrectOptionCount >= 1,
            _ => false
        };

    private static bool HasValidScore(decimal points) =>
        points is >= QuestionConstraints.MinPoints and <= QuestionConstraints.MaxPoints &&
        decimal.Round(points, QuestionConstraints.PointsScale) == points;
}
