using System.Reflection;

using ExamForge.Application.Student.Statistics.Enums;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.Persistence;
using ExamForge.Infrastructure.Statistics;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Api.Tests;

public sealed class StudentStatisticsQueryTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-08-04T12:00:00Z");

    [Fact]
    public async Task Dashboard_UsesAllTimeSubmittedAttempts_AndIsolatesStudent()
    {
        await using var db = CreateContext();
        var student = Guid.NewGuid();
        var otherStudent = Guid.NewGuid();
        await AddAttemptAsync(db, student, Now.AddDays(-500), ExamAttemptMode.Practice, 1m, 2m,
            ExamAttemptAnswerGradingStatus.Correct);
        await AddAttemptAsync(db, student, Now.AddDays(-1), ExamAttemptMode.Exam, 1m, 4m,
            ExamAttemptAnswerGradingStatus.Unanswered);
        await AddAttemptAsync(db, student, Now, ExamAttemptMode.Practice, 0m, 1m,
            ExamAttemptAnswerGradingStatus.Incorrect, ExamAttemptStatus.InProgress);
        await AddAttemptAsync(db, student, Now, ExamAttemptMode.Practice, 0m, 1m,
            ExamAttemptAnswerGradingStatus.Incorrect, ExamAttemptStatus.Abandoned);
        await AddAttemptAsync(db, otherStudent, Now.AddDays(-1), ExamAttemptMode.Practice, 1m, 1m,
            ExamAttemptAnswerGradingStatus.Correct);

        var result = await Query(db).GetDashboardAsync(student);

        Assert.Equal(2, result.CompletedAttempts);
        Assert.Equal(37.5m, result.AverageScorePercentage);
        Assert.Equal(1, result.QuestionsAnswered);
    }

    [Theory]
    [InlineData(StatisticsPeriod.Last30Days, 2)]
    [InlineData(StatisticsPeriod.Last90Days, 3)]
    [InlineData(StatisticsPeriod.All, 4)]
    public async Task Periods_IncludeBoundaries_AndAllTimeHasNoLowerBound(
        StatisticsPeriod period,
        int expected)
    {
        await using var db = CreateContext();
        var student = Guid.NewGuid();
        foreach (var submittedAt in new[]
        {
            Now.AddDays(-91), Now.AddDays(-90), Now.AddDays(-30), Now
        })
        {
            await AddAttemptAsync(db, student, submittedAt, ExamAttemptMode.Practice, 1m, 1m,
                ExamAttemptAnswerGradingStatus.Correct);
        }
        await AddAttemptAsync(db, student, Now.AddTicks(1), ExamAttemptMode.Practice, 1m, 1m,
            ExamAttemptAnswerGradingStatus.Correct);

        var result = await Query(db).GetStatisticsAsync(student, period, StatisticsModeFilter.All);

        Assert.Equal(expected, result.Overview.CompletedAttempts);
        Assert.Equal(Now, result.Filters.ToUtc);
        Assert.Equal(period == StatisticsPeriod.All ? null : Now.AddDays(period == StatisticsPeriod.Last30Days ? -30 : -90), result.Filters.FromUtc);
    }

    [Theory]
    [InlineData(StatisticsModeFilter.All, 3)]
    [InlineData(StatisticsModeFilter.Practice, 2)]
    [InlineData(StatisticsModeFilter.Exam, 1)]
    public async Task ModeFiltersApplyToEveryMetric(StatisticsModeFilter mode, int expected)
    {
        await using var db = CreateContext();
        var student = Guid.NewGuid();
        await AddAttemptAsync(db, student, Now, ExamAttemptMode.Practice, 1m, 1m, ExamAttemptAnswerGradingStatus.Correct);
        await AddAttemptAsync(db, student, Now, ExamAttemptMode.Practice, 1m, 1m, ExamAttemptAnswerGradingStatus.Correct);
        await AddAttemptAsync(db, student, Now, ExamAttemptMode.Exam, 1m, 1m, ExamAttemptAnswerGradingStatus.Correct);

        var result = await Query(db).GetStatisticsAsync(student, StatisticsPeriod.All, mode);

        Assert.Equal(expected, result.Overview.CompletedAttempts);
        Assert.Equal(expected, result.Overview.QuestionsAnswered);
        Assert.Equal(expected, result.ScoreTrend.Count);
        Assert.Equal(expected, result.PerformanceByExam.Sum(item => item.AttemptCount));
    }

    [Fact]
    public async Task Average_IsMeanOfDecimalAttemptPercentages_AndZeroMaximumOnlyCountsCompleted()
    {
        await using var db = CreateContext();
        var student = Guid.NewGuid();
        await AddAttemptAsync(db, student, Now, ExamAttemptMode.Practice, 1m, 3m, ExamAttemptAnswerGradingStatus.PartiallyCorrect);
        await AddAttemptAsync(db, student, Now, ExamAttemptMode.Practice, 1m, 2m, ExamAttemptAnswerGradingStatus.PartiallyCorrect);
        await AddAttemptAsync(db, student, Now, ExamAttemptMode.Practice, 0m, 0m, ExamAttemptAnswerGradingStatus.Unanswered);

        var result = await Query(db).GetStatisticsAsync(student, StatisticsPeriod.All, StatisticsModeFilter.All);

        Assert.Equal(3, result.Overview.CompletedAttempts);
        Assert.Equal(41.666666666666666666666666665m, result.Overview.AverageScorePercentage);
        Assert.Equal(2, result.ScoreTrend.Count);
    }

    [Fact]
    public async Task MissingValidScoresReturnNullAndEmptyCollectionsRemainValid()
    {
        await using var db = CreateContext();
        var student = Guid.NewGuid();
        await AddAttemptAsync(db, student, Now, ExamAttemptMode.Practice, 0m, 0m, ExamAttemptAnswerGradingStatus.Unanswered);

        var zeroMaximum = await Query(db).GetStatisticsAsync(student, StatisticsPeriod.All, StatisticsModeFilter.All);
        var empty = await Query(db).GetStatisticsAsync(Guid.NewGuid(), StatisticsPeriod.All, StatisticsModeFilter.All);

        Assert.Null(zeroMaximum.Overview.AverageScorePercentage);
        Assert.Null(Assert.Single(zeroMaximum.PerformanceByExam).LatestScorePercentage);
        Assert.Empty(zeroMaximum.ScoreTrend);
        Assert.Equal(0, empty.Overview.CompletedAttempts);
        Assert.Null(empty.Overview.AverageScorePercentage);
        Assert.Empty(empty.PerformanceByExam);
        Assert.Empty(empty.PerformanceByQuestionType);
    }

    [Fact]
    public async Task QuestionTypePerformance_AggregatesPointsAndEveryGradingStatus()
    {
        await using var db = CreateContext();
        var student = Guid.NewGuid();
        var exam = NewExam("Question types");
        var version = NewVersion(exam, 1);
        var section = new ExamSection(version.Id, ExamSectionKind.Default, "Section", null, null, null, 1);
        var questions = Enumerable.Range(0, 4)
            .Select(index => new Question(section.Id, null, QuestionType.MultipleChoiceSingle, $"Q{index}", null, 2m, index))
            .ToList();
        var attempt = new ExamAttempt(student, exam.Id, version.Id, ExamAttemptMode.Practice, Now.AddMinutes(-10), null, questions.Select(q => q.Id));
        var statuses = new[] { ExamAttemptAnswerGradingStatus.Correct, ExamAttemptAnswerGradingStatus.PartiallyCorrect, ExamAttemptAnswerGradingStatus.Incorrect, ExamAttemptAnswerGradingStatus.Unanswered };
        var awarded = new[] { 2m, 1m, 0m, 0m };
        attempt.Submit(questions.Select((question, index) => new ExamAttemptAnswerGradeResult(question.Id, awarded[index], 2m, statuses[index])).ToList(), 3m, 8m, Now);
        db.AddRange(exam, version, section);
        db.AddRange(questions);
        db.Add(attempt);
        await db.SaveChangesAsync();

        var result = await Query(db).GetStatisticsAsync(student, StatisticsPeriod.All, StatisticsModeFilter.All);
        var row = Assert.Single(result.PerformanceByQuestionType);

        Assert.Equal(3, result.Overview.QuestionsAnswered);
        Assert.Equal(3m, row.PointsEarned);
        Assert.Equal(8m, row.MaximumPoints);
        Assert.Equal(37.5m, row.PointsPercentage);
        Assert.Equal((1, 1, 1, 1), (row.CorrectCount, row.PartiallyCorrectCount, row.IncorrectCount, row.UnansweredCount));
    }

    [Fact]
    public async Task PerformanceByExam_GroupsVersions_SelectsLatestValid_AndLimitsDeterministically()
    {
        await using var db = CreateContext();
        var student = Guid.NewGuid();
        var groupedExam = NewExam("Grouped");
        await AddAttemptAsync(db, student, Now.AddDays(-2), ExamAttemptMode.Practice, 1m, 2m, ExamAttemptAnswerGradingStatus.Correct, exam: groupedExam, versionNumber: 1);
        await AddAttemptAsync(db, student, Now.AddDays(-1), ExamAttemptMode.Practice, 0m, 0m, ExamAttemptAnswerGradingStatus.Unanswered, exam: groupedExam, versionNumber: 2);
        await AddAttemptAsync(db, student, Now, ExamAttemptMode.Practice, 3m, 4m, ExamAttemptAnswerGradingStatus.Correct, exam: groupedExam, versionNumber: 3);
        for (var index = 0; index < 11; index++)
        {
            await AddAttemptAsync(db, student, Now, ExamAttemptMode.Practice, 1m, 1m, ExamAttemptAnswerGradingStatus.Correct, exam: NewExam($"Tie {index:D2}"));
        }

        var result = await Query(db).GetStatisticsAsync(student, StatisticsPeriod.All, StatisticsModeFilter.All);

        Assert.Equal(10, result.PerformanceByExam.Count);
        var grouped = result.PerformanceByExam[0];
        Assert.Equal(groupedExam.Id, grouped.ExamId);
        Assert.Equal(3, grouped.AttemptCount);
        Assert.Equal(75m, grouped.LatestScorePercentage);
        Assert.Equal(62.5m, grouped.AverageScorePercentage);
        Assert.Equal(75m, grouped.BestScorePercentage);
        Assert.Equal(result.PerformanceByExam.Skip(1).OrderBy(item => item.ExamTitle).Select(item => item.ExamId), result.PerformanceByExam.Skip(1).Select(item => item.ExamId));
    }

    [Fact]
    public async Task ScoreTrend_IsLatestTwenty_ThenReturnedChronologically()
    {
        await using var db = CreateContext();
        var student = Guid.NewGuid();
        var exam = NewExam("Trend");
        for (var index = 0; index < 25; index++)
        {
            await AddAttemptAsync(db, student, Now.AddDays(-index), ExamAttemptMode.Practice, index + 1, 100m, ExamAttemptAnswerGradingStatus.PartiallyCorrect, exam: exam, versionNumber: index + 1);
        }

        var result = await Query(db).GetStatisticsAsync(student, StatisticsPeriod.All, StatisticsModeFilter.All);

        Assert.Equal(20, result.ScoreTrend.Count);
        Assert.True(result.ScoreTrend.Select(point => point.SubmittedAtUtc).SequenceEqual(result.ScoreTrend.Select(point => point.SubmittedAtUtc).Order()));
        Assert.Equal(Now.AddDays(-19), result.ScoreTrend[0].SubmittedAtUtc);
        Assert.Equal(Now, result.ScoreTrend[^1].SubmittedAtUtc);
    }

    [Fact]
    public void FilteredAttemptQuery_TranslatesStudentStatusPeriodUpperBoundaryAndModeToPostgres()
    {
        var options = new DbContextOptionsBuilder<ExamForgeDbContext>()
            .UseNpgsql("Host=localhost;Database=examforge;Username=examforge;Password=examforge")
            .Options;
        using var db = new ExamForgeDbContext(options);
        var apply = typeof(StudentStatisticsQuery).GetMethod("ApplyFilters", BindingFlags.NonPublic | BindingFlags.Static)!;
        var student = Guid.NewGuid();
        var baseQuery = db.ExamAttempts.AsNoTracking().Where(attempt => attempt.StudentId == student && attempt.Status == ExamAttemptStatus.Submitted);
        var filtered = (IQueryable<ExamAttempt>)apply.Invoke(null, [baseQuery, Now.AddDays(-30), Now, StatisticsModeFilter.Practice])!;

        var sql = filtered.ToQueryString();

        Assert.Contains("StudentId", sql);
        Assert.Contains("Submitted", sql);
        Assert.Contains("SubmittedAtUtc", sql);
        Assert.Contains("Practice", sql);
    }

    [Fact]
    public void TrendExamAndQuestionAggregatesTranslateToPostgresWithServerLimits()
    {
        var options = new DbContextOptionsBuilder<ExamForgeDbContext>()
            .UseNpgsql("Host=localhost;Database=examforge;Username=examforge;Password=examforge")
            .Options;
        using var db = new ExamForgeDbContext(options);
        var attempts = db.ExamAttempts.AsNoTracking()
            .Where(attempt => attempt.StudentId == Guid.NewGuid() && attempt.Status == ExamAttemptStatus.Submitted);

        var trendSql = InvokeQuery("BuildTrendQuery", attempts).ToQueryString();
        var examSql = InvokeQuery("BuildExamPerformanceQuery", attempts).ToQueryString();
        var questionSql = InvokeQuery("BuildQuestionTypeQuery", db.ExamAttemptAnswers.AsNoTracking(), attempts).ToQueryString();

        Assert.Contains("LIMIT", trendSql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("20", trendSql, StringComparison.Ordinal);
        Assert.Contains("COUNT", examSql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("AVG", examSql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("MAX", examSql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("LIMIT", examSql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("10", examSql, StringComparison.Ordinal);
        Assert.Contains("SUM", questionSql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("COUNT", questionSql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("EXISTS", questionSql, StringComparison.OrdinalIgnoreCase);
    }

    private static StudentStatisticsQuery Query(ExamForgeDbContext db) => new(db, new FixedTimeProvider(Now));

    private static IQueryable InvokeQuery(string methodName, params object[] arguments) =>
        (IQueryable)typeof(StudentStatisticsQuery)
            .GetMethod(methodName, BindingFlags.NonPublic | BindingFlags.Static)!
            .Invoke(null, arguments)!;

    private static ExamForgeDbContext CreateContext() => new(
        new DbContextOptionsBuilder<ExamForgeDbContext>()
            .UseInMemoryDatabase($"statistics-{Guid.NewGuid()}")
            .Options);

    private static Exam NewExam(string title) => new(title, $"{title.ToLowerInvariant().Replace(' ', '-')}-{Guid.NewGuid():N}", "", ExamType.Simple);
    private static ExamVersion NewVersion(Exam exam, int number) => new(exam.Id, number, $"Version {number}", "", "", 60, Guid.NewGuid());

    private static async Task<ExamAttempt> AddAttemptAsync(
        ExamForgeDbContext db,
        Guid studentId,
        DateTimeOffset submittedAt,
        ExamAttemptMode mode,
        decimal awarded,
        decimal maximum,
        ExamAttemptAnswerGradingStatus gradingStatus,
        ExamAttemptStatus status = ExamAttemptStatus.Submitted,
        Exam? exam = null,
        int versionNumber = 1)
    {
        exam ??= NewExam($"Exam {Guid.NewGuid():N}");
        var version = NewVersion(exam, versionNumber);
        var section = new ExamSection(version.Id, ExamSectionKind.Default, "Section", null, null, null, 1);
        var question = new Question(section.Id, null, QuestionType.FillBlank, "Question", null, maximum, 1);
        var attempt = new ExamAttempt(studentId, exam.Id, version.Id, mode, submittedAt.AddMinutes(-10), mode == ExamAttemptMode.Exam ? submittedAt.AddMinutes(50) : null, [question.Id]);
        if (status == ExamAttemptStatus.Submitted)
        {
            attempt.Submit([new ExamAttemptAnswerGradeResult(question.Id, awarded, maximum, gradingStatus)], awarded, maximum, submittedAt);
        }
        else if (status == ExamAttemptStatus.Abandoned)
        {
            attempt.Abandon(submittedAt);
        }

        if (db.Entry(exam).State == EntityState.Detached) db.Add(exam);
        db.AddRange(version, section, question, attempt);
        await db.SaveChangesAsync();
        return attempt;
    }

    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}