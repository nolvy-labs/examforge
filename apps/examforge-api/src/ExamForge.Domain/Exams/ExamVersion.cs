using ExamForge.Domain.Common;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Users;

namespace ExamForge.Domain.Exams;

public sealed class ExamVersion
{
    private readonly List<ExamSection> _sections = [];
    private readonly List<ExamAttempt> _attempts = [];

    private ExamVersion() { }

    public ExamVersion(
        Guid examId,
        int versionNumber,
        string title,
        string? description,
        string? instructions,
        int? durationMinutes,
        Guid createdByUserId)
    {
        Id = Guid.NewGuid();
        ExamId = examId;
        VersionNumber = versionNumber;
        Status = ExamVersionStatus.Draft;
        Title = TextNormalizer.NormalizeName(title);
        Description = description?.Trim() ?? string.Empty;
        Instructions = instructions?.Trim() ?? string.Empty;
        DurationMinutes = durationMinutes;
        TotalScore = 0m;
        CreatedByUserId = createdByUserId;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid ExamId { get; private set; }
    public int VersionNumber { get; private set; }
    public ExamVersionStatus Status { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string Instructions { get; private set; } = string.Empty;
    public int? DurationMinutes { get; private set; }
    public decimal TotalScore { get; private set; }
    public DateTimeOffset? PublishedAtUtc { get; private set; }
    public DateTimeOffset? RetiredAtUtc { get; private set; }
    public Guid? CreatedByUserId { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? UpdatedAtUtc { get; private set; }

    public Exam Exam { get; private set; } = null!;
    public User? CreatedByUser { get; private set; }
    public IReadOnlyCollection<ExamSection> Sections => _sections;
    public IReadOnlyCollection<ExamAttempt> Attempts => _attempts;

    public bool UpdateDetails(
        string title,
        string? description,
        string? instructions,
        int? durationMinutes)
    {
        if (Status != ExamVersionStatus.Draft)
        {
            throw new InvalidOperationException("Only Draft exam versions can be edited.");
        }

        var normalizedTitle = TextNormalizer.NormalizeName(title);
        var normalizedDescription = description?.Trim() ?? string.Empty;
        var normalizedInstructions = instructions?.Trim() ?? string.Empty;

        if (Title == normalizedTitle &&
            Description == normalizedDescription &&
            Instructions == normalizedInstructions &&
            DurationMinutes == durationMinutes)
        {
            return false;
        }

        Title = normalizedTitle;
        Description = normalizedDescription;
        Instructions = normalizedInstructions;
        DurationMinutes = durationMinutes;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
        return true;
    }

    public bool Publish(DateTimeOffset publishedAtUtc)
    {
        if (Status == ExamVersionStatus.Published)
        {
            return false;
        }

        if (Status is not (ExamVersionStatus.Draft or ExamVersionStatus.Retired))
        {
            throw new InvalidOperationException("This exam version cannot be published.");
        }

        Status = ExamVersionStatus.Published;
        PublishedAtUtc = publishedAtUtc;
        RetiredAtUtc = null;
        UpdatedAtUtc = publishedAtUtc;
        return true;
    }

    public bool Retire(DateTimeOffset retiredAtUtc)
    {
        if (Status == ExamVersionStatus.Retired)
        {
            return false;
        }

        if (Status != ExamVersionStatus.Published)
        {
            throw new InvalidOperationException("Only Published exam versions can be retired.");
        }

        Status = ExamVersionStatus.Retired;
        RetiredAtUtc = retiredAtUtc;
        UpdatedAtUtc = retiredAtUtc;
        return true;
    }
}