using System.Reflection;

using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class ExamVersionContentRevisionTests
{
    [Fact]
    public void New_version_starts_at_one_and_advances_once()
    {
        var version = CreateVersion();

        version.AdvanceContentRevision();

        Assert.Equal(2, version.ContentRevision);
    }

    [Fact]
    public void Revision_overflow_raises_domain_error_without_wrapping()
    {
        var version = CreateVersion();
        typeof(ExamVersion).GetProperty(nameof(ExamVersion.ContentRevision),
                BindingFlags.Instance | BindingFlags.Public)!
            .SetValue(version, long.MaxValue);

        var exception = Assert.Throws<ExamVersionContentRevisionExhaustedException>(
            version.AdvanceContentRevision);

        Assert.Equal(version.Id, exception.VersionId);
        Assert.Equal(long.MaxValue, version.ContentRevision);
    }

    private static ExamVersion CreateVersion() =>
        new(Guid.NewGuid(), 1, "Version", null, null, null, Guid.NewGuid());
}