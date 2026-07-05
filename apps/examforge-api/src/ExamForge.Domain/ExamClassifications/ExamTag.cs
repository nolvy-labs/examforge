using ExamForge.Domain.Common;

namespace ExamForge.Domain.ExamClassifications;

public sealed class ExamTag
{
    private readonly List<ExamCategoryTag> _examCategoryTags = [];

    private ExamTag() { }

    public ExamTag(
        string name,
        string? slug,
        string description,
        ExamTagType type
        )
    {
        Id = Guid.NewGuid();
        Name = TextNormalizer.NormalizeName(name);
        Slug = TextNormalizer.NormalizeSlug(string.IsNullOrWhiteSpace(slug) ? name : slug);
        Description = description.Trim();
        Type = type;
        IsArchived = false;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; } = String.Empty;

    public string Slug { get; private set; } = String.Empty;

    public string Description { get; private set; } = String.Empty;

    public ExamTagType Type { get; private set; }

    public bool IsArchived { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; private set; }

    public DateTimeOffset? UpdatedAtUtc { get; private set; }

    public IReadOnlyCollection<ExamCategoryTag> ExamCategoryTags => _examCategoryTags;

    public void UpdateDetails(
        string name,
        string slug,
        string description,
        ExamTagType type)
    {
        Name = TextNormalizer.NormalizeName(name);
        Slug = TextNormalizer.NormalizeSlug(slug);
        Description = description.Trim();
        Type = type;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    public void Archive()
    {
        IsArchived = true;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    public void Restore()
    {
        IsArchived = false;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }
}
