namespace ExamForge.Domain.Exams;

public static class QuestionConstraints
{
    public const int PromptMaxLength = 20000;
    public const int ExplanationMaxLength = 20000;
    public const decimal MinPoints = 0.01m;
    public const decimal MaxPoints = 999999.99m;
    public const int PointsScale = 2;
}