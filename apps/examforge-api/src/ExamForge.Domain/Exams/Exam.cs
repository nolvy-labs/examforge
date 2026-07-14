using ExamForge.Domain.Common;
using ExamForge.Domain.ExamAttempts;

namespace ExamForge.Domain.Exams;

public sealed class Exam
{
    private readonly List<ExamTagMapping> _examTagMappings = [];
    private readonly List<ExamVersion> _versions = [];
    private readonly List<ExamAttempt> _attempts = [];

    private Exam() { }

    public Exam(string title, string slug, string? description, ExamType type)
    {
        Id = Guid.NewGuid();
        Title = TextNormalizer.NormalizeName(title);
        Slug = slug;
        Description = description?.Trim() ?? string.Empty;
        Type = type;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid Id { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public ExamType Type { get; private set; }
    public bool IsArchived { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? UpdatedAtUtc { get; private set; }

    public IReadOnlyCollection<ExamTagMapping> ExamTagMappings => _examTagMappings;
    public IReadOnlyCollection<ExamVersion> Versions => _versions;
    public IReadOnlyCollection<ExamAttempt> Attempts => _attempts;

    public void UpdateDetails(string title, string slug, string? description, ExamType type)
    {
        var normalizedTitle = TextNormalizer.NormalizeName(title);
        var normalizedDescription = description?.Trim() ?? string.Empty;

        if (Title == normalizedTitle &&
            Slug == slug &&
            Description == normalizedDescription &&
            Type == type)
        {
            return;
        }

        Title = normalizedTitle;
        Slug = slug;
        Description = normalizedDescription;
        Type = type;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    public void AddTags(IEnumerable<Guid> examTagIds)
    {
        var existingTagIds = _examTagMappings
            .Select(mapping => mapping.ExamTagId)
            .ToHashSet();
        var changed = false;

        foreach (var examTagId in examTagIds.Distinct())
        {
            if (existingTagIds.Add(examTagId))
            {
                _examTagMappings.Add(new ExamTagMapping(Id, examTagId));
                changed = true;
            }
        }

        TouchIf(changed);
    }

    public void RemoveTags(IEnumerable<Guid> examTagIds)
    {
        var tagIds = examTagIds.ToHashSet();
        var removedCount = _examTagMappings.RemoveAll(
            mapping => tagIds.Contains(mapping.ExamTagId));

        TouchIf(removedCount > 0);
    }

    public void Archive()
    {
        if (IsArchived)
        {
            return;
        }

        IsArchived = true;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    public void Restore()
    {
        if (!IsArchived)
        {
            return;
        }

        IsArchived = false;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    private void TouchIf(bool changed)
    {
        if (changed)
        {
            UpdatedAtUtc = DateTimeOffset.UtcNow;
        }
    }
}