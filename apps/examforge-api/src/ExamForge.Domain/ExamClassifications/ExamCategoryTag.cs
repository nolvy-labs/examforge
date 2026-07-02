namespace ExamForge.Domain.ExamClassifications;

public sealed class ExamCategoryTag
{
    private ExamCategoryTag() { }

    public ExamCategoryTag(
        Guid examCategoryId,
        Guid examTagId)
    {
        ExamCategoryId = examCategoryId;
        ExamTagId = examTagId;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid ExamCategoryId { get; private set; }

    public Guid ExamTagId { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; private set; }
}
