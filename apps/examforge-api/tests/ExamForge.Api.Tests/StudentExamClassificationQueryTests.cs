using System.Reflection;

using ExamForge.Domain.ExamClassifications;
using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.ExamClassifications.Student;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Api.Tests;

public sealed class StudentExamClassificationQueryTests
{
    [Fact]
    public async Task Filters_ReturnOnlyActiveTagsUsedByVisibleExams_WithDistinctCounts()
    {
        await using var fixture = await DiscoveryFixture.CreateAsync();

        var filters = await fixture.Query.GetFilterTagsAsync();

        Assert.Equal(2, filters.Count);
        var subject = Assert.Single(filters, tag => tag.Id == fixture.Subject.Id);
        var topic = Assert.Single(filters, tag => tag.Id == fixture.Topic.Id);
        Assert.Equal(2, subject.ExamCount);
        Assert.Equal(1, topic.ExamCount);
        Assert.DoesNotContain(filters, tag => tag.Id == fixture.ArchivedTag.Id);
        Assert.DoesNotContain(filters, tag => tag.Id == fixture.UnusedTag.Id);
    }

    [Fact]
    public async Task Categories_IncludeValidZeroMatchCategoriesAndApplyFeaturedFiltering()
    {
        await using var fixture = await DiscoveryFixture.CreateAsync();

        var categories = await fixture.Query.GetCategoriesAsync(featuredOnly: false);
        var featured = await fixture.Query.GetCategoriesAsync(featuredOnly: true);

        Assert.Equal(
            [fixture.AnyCategory.Id, fixture.AllCategory.Id, fixture.NoMatchesCategory.Id],
            categories.Select(category => category.Id));
        Assert.Equal(2, categories.Single(category =>
            category.Id == fixture.AnyCategory.Id).ExamCount);
        Assert.Equal(1, categories.Single(category =>
            category.Id == fixture.AllCategory.Id).ExamCount);
        Assert.Equal(0, categories.Single(category =>
            category.Id == fixture.NoMatchesCategory.Id).ExamCount);
        Assert.Equal(fixture.AnyCategory.Id, Assert.Single(featured).Id);
        Assert.All(categories, category => Assert.NotEmpty(category.Tags));
    }

    [Fact]
    public async Task CategoryDetailAndRule_AllowZeroMatchesButRejectInvalidConfiguration()
    {
        await using var fixture = await DiscoveryFixture.CreateAsync();

        var detail = await fixture.Query.GetCategoryBySlugAsync("all");
        var rule = await fixture.Query.GetCategoryRuleBySlugAsync("all");
        var archived = await fixture.Query.GetCategoryBySlugAsync("archived");
        var empty = await fixture.Query.GetCategoryBySlugAsync("empty");
        var broken = await fixture.Query.GetCategoryBySlugAsync("broken");
        var noMatches = await fixture.Query.GetCategoryBySlugAsync("no-matches");
        var noMatchRule = await fixture.Query.GetCategoryRuleBySlugAsync("no-matches");

        Assert.Equal(fixture.AllCategory.Id, detail!.Id);
        Assert.Equal(1, detail.ExamCount);
        Assert.Equal(ExamCategoryMatchMode.All, rule!.MatchMode);
        Assert.Equal(
            new[] { fixture.Subject.Id, fixture.Topic.Id }.OrderBy(id => id),
            rule.TagIds);
        Assert.Null(archived);
        Assert.Null(empty);
        Assert.Null(broken);
        Assert.Equal(fixture.NoMatchesCategory.Id, noMatches!.Id);
        Assert.Equal(0, noMatches.ExamCount);
        Assert.Equal(ExamCategoryMatchMode.Any, noMatchRule!.MatchMode);
        Assert.Equal(fixture.UnusedTag.Id, Assert.Single(noMatchRule.TagIds));
    }

    [Fact]
    public async Task ActiveTagValidation_ExcludesArchivedAndMissingIds()
    {
        await using var fixture = await DiscoveryFixture.CreateAsync();
        var missing = Guid.NewGuid();

        var ids = await fixture.Query.GetActiveTagIdsAsync(
            [fixture.Subject.Id, fixture.ArchivedTag.Id, missing]);

        Assert.Equal(fixture.Subject.Id, Assert.Single(ids));
    }

    [Theory]
    [InlineData("FilterTags")]
    [InlineData("CategoryCores")]
    [InlineData("CategoryExamCounts")]
    public void DiscoveryQueries_TranslateForPostgres(string methodName)
    {
        var options = new DbContextOptionsBuilder<ExamForgeDbContext>()
            .UseNpgsql(
                "Host=localhost;Database=examforge;Username=examforge;Password=examforge")
            .Options;
        using var db = new ExamForgeDbContext(options);
        var query = new StudentExamDiscoveryQuery(db);
        var method = typeof(StudentExamDiscoveryQuery).GetMethod(
            methodName,
            BindingFlags.Instance | BindingFlags.NonPublic);
        object?[]? arguments = methodName switch
        {
            "CategoryCores" => [false],
            "CategoryExamCounts" => [new[] { Guid.NewGuid() }],
            _ => null
        };
        var translated = Assert.IsAssignableFrom<IQueryable>(
            method!.Invoke(query, arguments));

        var sql = translated.ToQueryString();

        Assert.Contains("SELECT", sql, StringComparison.Ordinal);
        Assert.DoesNotContain("ClientProjection", sql, StringComparison.Ordinal);
    }

    private sealed class DiscoveryFixture : IAsyncDisposable
    {
        private DiscoveryFixture(
            ExamForgeDbContext db,
            ExamTag subject,
            ExamTag topic,
            ExamTag archivedTag,
            ExamTag unusedTag,
            ExamCategory anyCategory,
            ExamCategory allCategory,
            ExamCategory noMatchesCategory)
        {
            Db = db;
            Subject = subject;
            Topic = topic;
            ArchivedTag = archivedTag;
            UnusedTag = unusedTag;
            AnyCategory = anyCategory;
            AllCategory = allCategory;
            NoMatchesCategory = noMatchesCategory;
            Query = new StudentExamDiscoveryQuery(db);
        }

        public ExamForgeDbContext Db { get; }
        public StudentExamDiscoveryQuery Query { get; }
        public ExamTag Subject { get; }
        public ExamTag Topic { get; }
        public ExamTag ArchivedTag { get; }
        public ExamTag UnusedTag { get; }
        public ExamCategory AnyCategory { get; }
        public ExamCategory AllCategory { get; }
        public ExamCategory NoMatchesCategory { get; }

        public static async Task<DiscoveryFixture> CreateAsync()
        {
            var db = new ExamForgeDbContext(
                new DbContextOptionsBuilder<ExamForgeDbContext>()
                    .UseInMemoryDatabase($"exam-discovery-{Guid.NewGuid()}")
                    .Options);
            var subject = new ExamTag(
                "Mathematics", "mathematics", "", ExamTagType.Subject);
            var topic = new ExamTag(
                "Algorithms", "algorithms", "", ExamTagType.Topic);
            var archivedTag = new ExamTag(
                "Archived", "archived", "", ExamTagType.Topic);
            archivedTag.Archive();
            var unusedTag = new ExamTag(
                "Unused", "unused", "", ExamTagType.Skill);

            var complete = CreateExam("Complete", ExamVersionStatus.Published);
            complete.Exam.AddTags([subject.Id, topic.Id, archivedTag.Id]);
            var partial = CreateExam("Partial", ExamVersionStatus.Published);
            partial.Exam.AddTags([subject.Id]);
            var draft = CreateExam("Draft", ExamVersionStatus.Draft);
            draft.Exam.AddTags([topic.Id]);
            var archivedExam = CreateExam("Archived Exam", ExamVersionStatus.Published);
            archivedExam.Exam.AddTags([topic.Id]);
            archivedExam.Exam.Archive();

            var any = Category(
                "Any", "any", ExamCategoryMatchMode.Any, [subject.Id, topic.Id]);
            any.MarkAsFeatured();
            var all = Category(
                "All", "all", ExamCategoryMatchMode.All, [subject.Id, topic.Id]);
            var archived = Category(
                "Archived", "archived", ExamCategoryMatchMode.Any, [subject.Id]);
            archived.Archive();
            var empty = Category(
                "Empty", "empty", ExamCategoryMatchMode.All, []);
            var broken = Category(
                "Broken", "broken", ExamCategoryMatchMode.Any,
                [subject.Id, archivedTag.Id]);
            var noMatches = Category(
                "No Matches", "no-matches", ExamCategoryMatchMode.Any,
                [unusedTag.Id]);

            db.AddRange(subject, topic, archivedTag, unusedTag,
                complete.Exam, complete.Version,
                partial.Exam, partial.Version,
                draft.Exam, draft.Version,
                archivedExam.Exam, archivedExam.Version,
                any, all, archived, empty, broken, noMatches);
            await db.SaveChangesAsync();
            return new DiscoveryFixture(
                db, subject, topic, archivedTag, unusedTag, any, all, noMatches);
        }

        public ValueTask DisposeAsync() => Db.DisposeAsync();

        private static ExamCategory Category(
            string name,
            string slug,
            ExamCategoryMatchMode matchMode,
            IReadOnlyCollection<Guid> tagIds)
        {
            var category = new ExamCategory(name, slug, "", matchMode, 1);
            category.ReplaceTags(tagIds);
            return category;
        }

        private static (Exam Exam, ExamVersion Version) CreateExam(
            string title,
            ExamVersionStatus status)
        {
            var exam = new Exam(title, title, "", ExamType.Simple);
            var version = new ExamVersion(
                exam.Id, 1, title, "", "", null, Guid.NewGuid());
            if (status == ExamVersionStatus.Published)
            {
                version.Publish(DateTimeOffset.UtcNow);
            }

            return (exam, version);
        }
    }
}