using ExamForge.Domain.Common;

namespace ExamForge.Domain.ExamClassifications;

public sealed class ExamCategory
{
    private readonly List<ExamCategoryTag> _examCategoryTags = [];

    private ExamCategory() { }

    public ExamCategory(
        string name,
        string? slug,
        string? description,
        ExamCategoryMatchMode matchMode,
        int displayOrder
        )
    {
        Id = Guid.NewGuid();
        Name = TextNormalizer.NormalizeName(name);
        Slug = TextNormalizer.NormalizeSlug(string.IsNullOrWhiteSpace(slug) ? name : slug);
        Description = description?.Trim();
        MatchMode = matchMode;
        IsFeatured = false;
        IsArchived = false;
        DisplayOrder = displayOrder;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; } = String.Empty;

    public string Slug { get; private set; } = String.Empty;

    public string? Description { get; private set; }

    public ExamCategoryMatchMode MatchMode { get; private set; }

    public bool IsFeatured { get; private set; }

    public bool IsArchived { get; private set; }

    public int DisplayOrder { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; private set; }

    public DateTimeOffset? UpdatedAtUtc { get; private set; }

    public IReadOnlyCollection<ExamCategoryTag> ExamCategoryTags => _examCategoryTags;

    public void Archive()
    {
        IsArchived = true;
        IsFeatured = false;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    public void Restore()
    {
        IsArchived = false;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    public void MarkAsFeatured()
    {
        IsFeatured = true;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    public void UnmarkAsFeatured()
    {
        IsFeatured = false;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    public void ChangeDisplayOrder(int displayOrder)
    {
        DisplayOrder = displayOrder;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }
}
