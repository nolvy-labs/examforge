namespace ExamForge.Domain.Exams;

public static class ExamVersionConstraints
{
    public const int TitleMaxLength = 200;
    public const int DescriptionMaxLength = 2000;
    public const int InstructionsMaxLength = 10000;
    public const int MaxDurationMinutes = 1440;
    public const int MaxPageSize = 100;
}