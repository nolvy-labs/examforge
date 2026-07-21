using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Api.Tests;

public sealed class ExamVersionContentRevisionPersistenceTests
{
    [Fact]
    public void Content_revision_is_required_concurrency_token_with_default_one()
    {
        var options = new DbContextOptionsBuilder<ExamForgeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var context = new ExamForgeDbContext(options);

        var property = context.Model.FindEntityType(typeof(ExamVersion))!
            .FindProperty(nameof(ExamVersion.ContentRevision))!;

        Assert.False(property.IsNullable);
        Assert.True(property.IsConcurrencyToken);
        Assert.Equal(1L, property.GetDefaultValue());
    }
}