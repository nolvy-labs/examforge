using ExamForge.Domain.Common;

namespace ExamForge.Domain.Exams;

public sealed class ExamSection
{
    private readonly List<Question> _questions = [];

    private ExamSection() { }

    public ExamSection(
        Guid examVersionId,
        ExamSectionKind kind,
        string? title,
        string? instructions,
        string? stimulusText,
        string? mediaUrl,
        int displayOrder,
        string? metadataJson = null)
    {
        Id = Guid.NewGuid();
        ExamVersionId = examVersionId;
        Kind = kind;
        Title = NormalizeDraftTitle(title);
        Instructions = instructions?.Trim() ?? string.Empty;
        StimulusText = stimulusText?.Trim();
        MediaUrl = mediaUrl?.Trim();
        DisplayOrder = displayOrder;
        MetadataJson = metadataJson;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid ExamVersionId { get; private set; }
    public ExamSectionKind Kind { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Instructions { get; private set; } = string.Empty;
    public string? StimulusText { get; private set; }
    public string? MediaUrl { get; private set; }
    public int DisplayOrder { get; private set; }
    public string? MetadataJson { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? UpdatedAtUtc { get; private set; }

    public ExamVersion ExamVersion { get; private set; } = null!;
    public IReadOnlyCollection<Question> Questions => _questions;

    public bool UpdateDetails(
        ExamSectionKind kind,
        string? title,
        string? instructions,
        string? stimulusText,
        string? mediaUrl)
    {
        var normalizedTitle = NormalizeDraftTitle(title);
        var normalizedInstructions = instructions?.Trim() ?? string.Empty;
        var normalizedStimulusText = stimulusText?.Trim();
        var normalizedMediaUrl = mediaUrl?.Trim();

        if (Kind == kind &&
            Title == normalizedTitle &&
            Instructions == normalizedInstructions &&
            StimulusText == normalizedStimulusText &&
            MediaUrl == normalizedMediaUrl)
        {
            return false;
        }

        Kind = kind;
        Title = normalizedTitle;
        Instructions = normalizedInstructions;
        StimulusText = normalizedStimulusText;
        MediaUrl = normalizedMediaUrl;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
        return true;
    }

    public bool ChangeDisplayOrder(int displayOrder)
    {
        if (DisplayOrder == displayOrder)
        {
            return false;
        }

        DisplayOrder = displayOrder;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
        return true;
    }

    private static string NormalizeDraftTitle(string? title) =>
        string.IsNullOrWhiteSpace(title) ? string.Empty : TextNormalizer.NormalizeName(title);
}