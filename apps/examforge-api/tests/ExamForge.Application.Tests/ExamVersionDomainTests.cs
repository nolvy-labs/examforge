using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class ExamVersionDomainTests
{
    [Fact]
    public void Constructor_normalizes_metadata_and_initializes_draft()
    {
        var version = CreateVersion("  Version   title ", null, null);

        Assert.Equal("Version title", version.Title);
        Assert.Equal(string.Empty, version.Description);
        Assert.Equal(string.Empty, version.Instructions);
        Assert.Equal(ExamVersionStatus.Draft, version.Status);
        Assert.Equal(0m, version.TotalScore);
    }

    [Fact]
    public void Update_is_idempotent_and_draft_only()
    {
        var version = CreateVersion();

        Assert.False(version.UpdateDetails(version.Title, version.Description, version.Instructions, version.DurationMinutes));
        version.Publish(DateTimeOffset.UtcNow);
        Assert.Throws<InvalidOperationException>(() =>
            version.UpdateDetails("Changed", "", "", null));
    }

    [Fact]
    public void Publish_and_retire_enforce_transitions()
    {
        var version = CreateVersion();
        var publishedAt = DateTimeOffset.UtcNow;

        Assert.True(version.Publish(publishedAt));
        Assert.False(version.Publish(publishedAt.AddMinutes(1)));
        Assert.True(version.Retire(publishedAt.AddMinutes(2)));
        Assert.False(version.Retire(publishedAt.AddMinutes(3)));
        Assert.True(version.Publish(publishedAt.AddMinutes(4)));
        Assert.Null(version.RetiredAtUtc);
        Assert.Equal(publishedAt.AddMinutes(4), version.PublishedAtUtc);
    }

    [Fact]
    public void Draft_cannot_be_retired()
    {
        var version = CreateVersion();
        Assert.Throws<InvalidOperationException>(() => version.Retire(DateTimeOffset.UtcNow));
    }

    private static ExamVersion CreateVersion(
        string title = "Version title",
        string? description = "Description",
        string? instructions = "Instructions")
    {
        return new ExamVersion(
            Guid.NewGuid(),
            1,
            title,
            description,
            instructions,
            30,
            Guid.NewGuid());
    }
}