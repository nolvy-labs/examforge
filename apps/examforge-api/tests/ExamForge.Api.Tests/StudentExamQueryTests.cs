using System.Reflection;

using ExamForge.Application.Student.Exams.Enums;
using ExamForge.Application.Student.Exams.Models;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.Exams.Student;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Api.Tests;

public sealed class StudentExamQueryTests
{
    [Fact]
    public async Task GetPage_ReturnsOnlyActivePublishedExams_WithActiveTagsAndAnswerableQuestionCount()
    {
        await using var db = CreateContext();
        var activeTag = new ExamTag("Active", "active", "", ExamTagType.Topic);
        var archivedTag = new ExamTag("Archived", "archived", "", ExamTagType.Topic);
        archivedTag.Archive();

        var visible = CreateExamWithVersion(ExamVersionStatus.Published, "Visible");
        visible.Exam.AddTags([activeTag.Id, archivedTag.Id]);
        var section = new ExamSection(visible.Version.Id, ExamSectionKind.Default, "Section", null, null, null, 1);
        var group = new Question(section.Id, null, QuestionType.Group, "Group", null, 0, 1);
        var child = new Question(section.Id, group.Id, QuestionType.FillBlank, "Child", null, 2, 1);
        var archived = CreateExamWithVersion(ExamVersionStatus.Published, "Archived");
        archived.Exam.Archive();
        var draft = CreateExamWithVersion(ExamVersionStatus.Draft, "Draft");
        var retired = CreateExamWithVersion(ExamVersionStatus.Retired, "Retired");

        db.AddRange(activeTag, archivedTag, visible.Exam, visible.Version, section, group, child,
            archived.Exam, archived.Version, draft.Exam, draft.Version, retired.Exam, retired.Version);
        await db.SaveChangesAsync();

        var page = await new StudentExamQuery(db).GetPageAsync(DefaultPage());

        var item = Assert.Single(page.Items);
        Assert.Equal(visible.Exam.Id, item.Id);
        Assert.Equal(1, item.PublishedVersion.QuestionCount);
        Assert.Equal(activeTag.Id, Assert.Single(item.Tags).Id);
    }

    [Fact]
    public async Task GetPage_FiltersActiveTagAndReturnsEmptyForArchivedTag()
    {
        await using var db = CreateContext();
        var activeTag = new ExamTag("Active", "active", "", ExamTagType.Topic);
        var archivedTag = new ExamTag("Archived", "archived", "", ExamTagType.Topic); archivedTag.Archive();
        var published = CreateExamWithVersion(ExamVersionStatus.Published, "Visible");
        published.Exam.AddTags([activeTag.Id, archivedTag.Id]);
        db.AddRange(activeTag, archivedTag, published.Exam, published.Version);
        await db.SaveChangesAsync();
        var query = new StudentExamQuery(db);

        var active = await query.GetPageAsync(DefaultPage() with { TagId = activeTag.Id });
        var archived = await query.GetPageAsync(DefaultPage() with { TagId = archivedTag.Id });
        var slug = await query.GetPageAsync(DefaultPage() with
        { TagType = ExamTagType.Topic, TagSlug = "active" });

        Assert.Single(active.Items);
        Assert.Single(slug.Items);
        Assert.Empty(archived.Items);
    }

    [Fact]
    public async Task GetPage_CategoryAnyAllAndZeroActiveTagsBehaveCorrectly()
    {
        await using var db = CreateContext();
        var firstTag = new ExamTag("First", "first", "", ExamTagType.Topic);
        var secondTag = new ExamTag("Second", "second", "", ExamTagType.Topic);
        var archivedTag = new ExamTag("Old", "old", "", ExamTagType.Topic); archivedTag.Archive();
        var partial = CreateExamWithVersion(ExamVersionStatus.Published, "Partial"); partial.Exam.AddTags([firstTag.Id]);
        var complete = CreateExamWithVersion(ExamVersionStatus.Published, "Complete"); complete.Exam.AddTags([firstTag.Id, secondTag.Id]);
        var any = new ExamCategory("Any", "any", "", ExamCategoryMatchMode.Any, 1); any.ReplaceTags([firstTag.Id, secondTag.Id]);
        var all = new ExamCategory("All", "all", "", ExamCategoryMatchMode.All, 2); all.ReplaceTags([firstTag.Id, secondTag.Id, archivedTag.Id]);
        var empty = new ExamCategory("Empty", "empty", "", ExamCategoryMatchMode.All, 3); empty.ReplaceTags([archivedTag.Id]);
        db.AddRange(firstTag, secondTag, archivedTag, partial.Exam, partial.Version,
            complete.Exam, complete.Version, any, all, empty);
        await db.SaveChangesAsync();
        var query = new StudentExamQuery(db);

        var anyPage = await query.GetPageAsync(DefaultPage() with { CategorySlug = "any" });
        var allPage = await query.GetPageAsync(DefaultPage() with { CategoryId = all.Id });
        var emptyPage = await query.GetPageAsync(DefaultPage() with { CategoryId = empty.Id });
        any.Archive();
        await db.SaveChangesAsync();
        var archivedPage = await query.GetPageAsync(DefaultPage() with { CategoryId = any.Id });
        var missingPage = await query.GetPageAsync(DefaultPage() with { CategoryId = Guid.NewGuid() });

        Assert.Equal(2, anyPage.TotalItems);
        Assert.Equal(complete.Exam.Id, Assert.Single(allPage.Items).Id);
        Assert.Empty(emptyPage.Items);
        Assert.Empty(archivedPage.Items);
        Assert.Empty(missingPage.Items);
    }

    [Fact]
    public async Task GetPage_NewestAndOldestUseIdAsDeterministicTieBreaker()
    {
        await using var db = CreateContext();
        var first = CreateExamWithVersion(ExamVersionStatus.Published, "First");
        var second = CreateExamWithVersion(ExamVersionStatus.Published, "Second");
        var timestamp = DateTimeOffset.Parse("2026-01-01T00:00:00Z");
        typeof(Exam).GetProperty(nameof(Exam.CreatedAtUtc))!.SetValue(first.Exam, timestamp);
        typeof(Exam).GetProperty(nameof(Exam.CreatedAtUtc))!.SetValue(second.Exam, timestamp);
        db.AddRange(first.Exam, first.Version, second.Exam, second.Version);
        await db.SaveChangesAsync();
        var query = new StudentExamQuery(db);

        var newest = await query.GetPageAsync(DefaultPage());
        var oldest = await query.GetPageAsync(DefaultPage() with { Sort = StudentExamSortOrder.Oldest });

        Assert.Equal(new[] { first.Exam.Id, second.Exam.Id }.OrderByDescending(id => id), newest.Items.Select(item => item.Id));
        Assert.Equal(new[] { first.Exam.Id, second.Exam.Id }.OrderBy(id => id), oldest.Items.Select(item => item.Id));
    }

    [Fact]
    public async Task GetSection_RejectsSectionOutsideRequestedPublishedVersion()
    {
        await using var db = CreateContext();
        var published = CreateExamWithVersion(ExamVersionStatus.Published, "Published");
        var draft = CreateExamWithVersion(ExamVersionStatus.Draft, "Draft");
        var draftSection = new ExamSection(draft.Version.Id, ExamSectionKind.Default, "Draft", null, null, null, 1);
        db.AddRange(published.Exam, published.Version, draft.Exam, draft.Version, draftSection);
        await db.SaveChangesAsync();

        var result = await new StudentExamQuery(db).GetSectionAsync(published.Version.Id, draftSection.Id);

        Assert.Null(result);
    }

    [Theory]
    [InlineData("100%", "100\\%")]
    [InlineData("under_score", "under\\_score")]
    [InlineData("a\\b", "a\\\\b")]
    public void SearchPattern_EscapesPostgresLikeMetacharacters(string input, string expected)
    {
        var method = typeof(StudentExamQuery).GetMethod("EscapeLikePattern", BindingFlags.Static | BindingFlags.NonPublic);
        Assert.Equal(expected, method!.Invoke(null, [input]));
    }

    [Fact]
    public void Search_TranslatesToPostgresCaseInsensitiveLikeWithExplicitEscape()
    {
        var options = new DbContextOptionsBuilder<ExamForgeDbContext>()
            .UseNpgsql("Host=localhost;Database=examforge;Username=examforge;Password=examforge").Options;
        using var db = new ExamForgeDbContext(options);
        var method = typeof(StudentExamQuery).GetMethod("ApplySearch", BindingFlags.Static | BindingFlags.NonPublic);
        var query = (IQueryable<Exam>)method!.Invoke(null, [db.Exams.AsNoTracking(), "100%_\\"])!;

        var sql = query.ToQueryString();

        Assert.Contains("ILIKE", sql, StringComparison.Ordinal);
        Assert.Contains("ESCAPE '\\'", sql, StringComparison.Ordinal);
        Assert.Contains("100\\%\\_\\\\", sql, StringComparison.Ordinal);
    }

    private static StudentExamPageQuery DefaultPage() => new(
        0, 20, null, null, null, null, null, null, StudentExamSortOrder.Newest);

    private static ExamForgeDbContext CreateContext() => new(
        new DbContextOptionsBuilder<ExamForgeDbContext>()
            .UseInMemoryDatabase($"student-exams-{Guid.NewGuid()}").Options);

    private static (Exam Exam, ExamVersion Version) CreateExamWithVersion(ExamVersionStatus status, string title)
    {
        var exam = new Exam(title, title.ToLowerInvariant(), "", ExamType.Simple);
        var version = new ExamVersion(exam.Id, 1, title, "", "", null, Guid.NewGuid());
        if (status is ExamVersionStatus.Published or ExamVersionStatus.Retired)
            version.Publish(DateTimeOffset.UtcNow);
        if (status == ExamVersionStatus.Retired)
            version.Retire(DateTimeOffset.UtcNow);
        return (exam, version);
    }
}