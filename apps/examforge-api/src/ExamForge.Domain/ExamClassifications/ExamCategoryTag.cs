namespace ExamForge.Domain.ExamClassifications;

public sealed class ExamCategoryTag
{
    private ExamCategoryTag() { }

    public ExamCategoryTag(Guid examCategoryId, Guid examTagId)
    {
        ExamCategoryId = examCategoryId;
        ExamTagId = examTagId;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid ExamCategoryId { get; private set; }

    public ExamCategory ExamCategory { get; private set; } = null!;

    public Guid ExamTagId { get; private set; }

    public ExamTag ExamTag { get; private set; } = null!;

    public DateTimeOffset CreatedAtUtc { get; private set; }
}