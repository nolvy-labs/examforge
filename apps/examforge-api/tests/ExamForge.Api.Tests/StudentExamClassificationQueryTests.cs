using ExamForge.Domain.ExamClassifications;
using ExamForge.Infrastructure.ExamClassifications.Student;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Api.Tests;

public sealed class StudentExamClassificationQueryTests
{
    [Fact]
    public async Task StudentExamTagQuery_DoesNotReturnArchivedTags()
    {
        var options = new DbContextOptionsBuilder<ExamForgeDbContext>()
            .UseInMemoryDatabase($"exam-classifications-{Guid.NewGuid()}")
            .Options;

        await using var dbContext = new ExamForgeDbContext(options);

        var active = new ExamTag(
            "Active tag",
            "active-tag",
            "Visible to users",
            ExamTagType.Topic);
        var archived = new ExamTag(
            "Archived tag",
            "archived-tag",
            "Hidden from users",
            ExamTagType.Topic);
        archived.Archive();

        dbContext.ExamTags.AddRange(active, archived);
        await dbContext.SaveChangesAsync();

        var query = new StudentExamTagQuery(dbContext);

        var tags = await query.ListActiveAsync(ExamTagType.Topic);
        var archivedById = await query.GetActiveByIdAsync(archived.Id);
        var archivedBySlug = await query.GetActiveByTypeAndSlugAsync(
            archived.Type,
            archived.Slug);

        Assert.Contains(tags, tag => tag.Id == active.Id);
        Assert.DoesNotContain(tags, tag => tag.Id == archived.Id);
        Assert.Null(archivedById);
        Assert.Null(archivedBySlug);
    }
}
