using System.Reflection;

using ExamForge.Infrastructure.Exams.Admin;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Api.Tests;

public sealed class AdminNestedContentQueryTranslationTests
{
    [Theory]
    [InlineData("ListQuery", 4, "ORDER BY")]
    [InlineData("DetailQuery", 5, "WHERE")]
    public void QuestionOptionQueries_TranslateForPostgres(
        string methodName,
        int argumentCount,
        string expectedSql)
    {
        using var db = CreateContext();
        var repository = new AdminQuestionOptionRepository(db);

        AssertTranslates(repository, methodName, argumentCount, expectedSql);
    }

    [Theory]
    [InlineData("ListQuery", 4, "ORDER BY")]
    [InlineData("DetailQuery", 5, "WHERE")]
    public void FillAnswerKeyQueries_TranslateForPostgres(
        string methodName,
        int argumentCount,
        string expectedSql)
    {
        using var db = CreateContext();
        var repository = new AdminFillAnswerKeyRepository(db);

        AssertTranslates(repository, methodName, argumentCount, expectedSql);
    }

    private static ExamForgeDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ExamForgeDbContext>()
            .UseNpgsql(
                "Host=localhost;Database=examforge;Username=examforge;Password=examforge")
            .Options;
        return new ExamForgeDbContext(options);
    }

    private static void AssertTranslates(
        object repository,
        string methodName,
        int argumentCount,
        string expectedSql)
    {
        var method = repository.GetType().GetMethod(
            methodName,
            BindingFlags.Instance | BindingFlags.NonPublic);
        var arguments = Enumerable.Range(0, argumentCount)
            .Select(_ => (object)Guid.NewGuid())
            .ToArray();
        var query = Assert.IsAssignableFrom<IQueryable>(
            method!.Invoke(repository, arguments));

        var sql = query.ToQueryString();

        Assert.Contains("SELECT", sql, StringComparison.Ordinal);
        Assert.Contains(expectedSql, sql, StringComparison.Ordinal);
        Assert.DoesNotContain("ClientProjection", sql, StringComparison.Ordinal);
    }
}