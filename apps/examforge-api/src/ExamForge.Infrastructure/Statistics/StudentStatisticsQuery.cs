using ExamForge.Application.Student.Statistics.Abstractions;
using ExamForge.Application.Student.Statistics.Enums;
using ExamForge.Application.Student.Statistics.Models;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Statistics;

public sealed class StudentStatisticsQuery : IStudentStatisticsQuery
{
    private readonly ExamForgeDbContext _dbContext;
    private readonly TimeProvider _timeProvider;

    public StudentStatisticsQuery(
        ExamForgeDbContext dbContext,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _timeProvider = timeProvider;
    }

    public async Task<DashboardStatisticsModel> GetDashboardAsync(
        Guid studentId,
        CancellationToken cancellationToken = default)
    {
        var attempts = SubmittedAttempts(studentId);
        var aggregate = await GetAttemptAggregateAsync(attempts, cancellationToken);
        var questionsAnswered = await _dbContext.ExamAttemptAnswers
            .AsNoTracking()
            .CountAsync(answer =>
                answer.ExamAttempt.StudentId == studentId &&
                answer.ExamAttempt.Status == ExamAttemptStatus.Submitted &&
                answer.GradingStatus != ExamAttemptAnswerGradingStatus.Unanswered,
                cancellationToken);

        return new DashboardStatisticsModel(
            aggregate?.CompletedAttempts ?? 0,
            aggregate?.AverageScorePercentage,
            questionsAnswered);
    }

    public async Task<StudentStatisticsModel> GetStatisticsAsync(
        Guid studentId,
        StatisticsPeriod period,
        StatisticsModeFilter mode,
        CancellationToken cancellationToken = default)
    {
        var nowUtc = _timeProvider.GetUtcNow();
        var fromUtc = period switch
        {
            StatisticsPeriod.Last30Days => nowUtc.AddDays(-30),
            StatisticsPeriod.Last90Days => nowUtc.AddDays(-90),
            StatisticsPeriod.All => (DateTimeOffset?)null,
            _ => throw new ArgumentOutOfRangeException(nameof(period))
        };
        var attempts = ApplyFilters(SubmittedAttempts(studentId), fromUtc, nowUtc, mode);

        var aggregate = await GetAttemptAggregateAsync(attempts, cancellationToken);

        var trend = await BuildTrendQuery(attempts).ToListAsync(cancellationToken);
        trend.Reverse();

        var examPerformance = await BuildExamPerformanceQuery(attempts)
            .ToListAsync(cancellationToken);

        var answerRows = await BuildQuestionTypeQuery(
                _dbContext.ExamAttemptAnswers.AsNoTracking(),
                attempts)
            .ToListAsync(cancellationToken);

        var questionPerformance = answerRows
            .Select(row => new QuestionTypePerformanceModel(
                row.QuestionType,
                row.PointsEarned,
                row.MaximumPoints,
                row.PointsPercentage,
                row.CorrectCount,
                row.PartiallyCorrectCount,
                row.IncorrectCount,
                row.UnansweredCount))
            .ToList();

        return new StudentStatisticsModel(
            new StatisticsFiltersModel(PeriodValue(period), ModeValue(mode), fromUtc, nowUtc),
            new DashboardStatisticsModel(
                aggregate?.CompletedAttempts ?? 0,
                aggregate?.AverageScorePercentage,
                answerRows.Sum(row => row.AnsweredCount)),
            trend,
            examPerformance,
            questionPerformance);
    }

    private static IQueryable<ScoreTrendPointModel> BuildTrendQuery(
        IQueryable<ExamAttempt> attempts) =>
        attempts
            .Where(attempt => attempt.MaximumScore > 0m)
            .OrderByDescending(attempt => attempt.SubmittedAtUtc)
            .ThenByDescending(attempt => attempt.Id)
            .Take(20)
            .Select(attempt => new ScoreTrendPointModel(
                attempt.Id,
                attempt.ExamId,
                attempt.Exam.Slug,
                attempt.Exam.Title,
                attempt.ExamVersion.VersionNumber,
                attempt.Mode,
                attempt.SubmittedAtUtc!.Value,
                attempt.Score!.Value / attempt.MaximumScore!.Value * 100m));

    private static IQueryable<ExamPerformanceModel> BuildExamPerformanceQuery(
        IQueryable<ExamAttempt> attempts) =>
        attempts
            .GroupBy(attempt => new
            {
                attempt.ExamId,
                attempt.Exam.Slug,
                attempt.Exam.Title
            })
            .OrderByDescending(group => group.Count())
            .ThenBy(group => group.Key.Title)
            .ThenBy(group => group.Key.ExamId)
            .Take(10)
            .Select(group => new ExamPerformanceModel(
                group.Key.ExamId,
                group.Key.Slug,
                group.Key.Title,
                group.Count(),
                group.Where(attempt => attempt.MaximumScore > 0m)
                    .OrderByDescending(attempt => attempt.SubmittedAtUtc)
                    .ThenByDescending(attempt => attempt.Id)
                    .Select(attempt => attempt.Score / attempt.MaximumScore * 100m)
                    .FirstOrDefault(),
                group.Where(attempt => attempt.MaximumScore > 0m)
                    .Average(attempt => attempt.Score / attempt.MaximumScore * 100m),
                group.Where(attempt => attempt.MaximumScore > 0m)
                    .Max(attempt => attempt.Score / attempt.MaximumScore * 100m)));

    private static IQueryable<QuestionTypeAggregate> BuildQuestionTypeQuery(
        IQueryable<ExamAttemptAnswer> answers,
        IQueryable<ExamAttempt> attempts) =>
        answers
            .Where(answer => attempts.Any(attempt => attempt.Id == answer.ExamAttemptId))
            .GroupBy(answer => answer.Question.Type)
            .OrderBy(group => group.Key)
            .Select(group => new QuestionTypeAggregate(
                group.Key,
                group.Sum(answer => answer.AwardedScore ?? 0m),
                group.Sum(answer => answer.MaximumScore ?? 0m),
                group.Sum(answer => answer.MaximumScore ?? 0m) > 0m
                    ? group.Sum(answer => answer.AwardedScore ?? 0m) /
                        group.Sum(answer => answer.MaximumScore ?? 0m) * 100m
                    : null,
                group.Count(answer => answer.GradingStatus != ExamAttemptAnswerGradingStatus.Unanswered),
                group.Count(answer => answer.GradingStatus == ExamAttemptAnswerGradingStatus.Correct),
                group.Count(answer => answer.GradingStatus == ExamAttemptAnswerGradingStatus.PartiallyCorrect),
                group.Count(answer => answer.GradingStatus == ExamAttemptAnswerGradingStatus.Incorrect),
                group.Count(answer => answer.GradingStatus == ExamAttemptAnswerGradingStatus.Unanswered)));

    private IQueryable<ExamAttempt> SubmittedAttempts(Guid studentId) =>
        _dbContext.ExamAttempts
            .AsNoTracking()
            .Where(attempt =>
                attempt.StudentId == studentId &&
                attempt.Status == ExamAttemptStatus.Submitted);

    private static IQueryable<ExamAttempt> ApplyFilters(
        IQueryable<ExamAttempt> attempts,
        DateTimeOffset? fromUtc,
        DateTimeOffset toUtc,
        StatisticsModeFilter mode)
    {
        attempts = attempts.Where(attempt => attempt.SubmittedAtUtc <= toUtc);
        if (fromUtc.HasValue)
        {
            attempts = attempts.Where(attempt => attempt.SubmittedAtUtc >= fromUtc.Value);
        }

        return mode switch
        {
            StatisticsModeFilter.All => attempts,
            StatisticsModeFilter.Practice => attempts.Where(
                attempt => attempt.Mode == ExamAttemptMode.Practice),
            StatisticsModeFilter.Exam => attempts.Where(
                attempt => attempt.Mode == ExamAttemptMode.Exam),
            _ => throw new ArgumentOutOfRangeException(nameof(mode))
        };
    }

    private static Task<AttemptAggregate?> GetAttemptAggregateAsync(
        IQueryable<ExamAttempt> attempts,
        CancellationToken cancellationToken) =>
        attempts
            .GroupBy(_ => 1)
            .Select(group => new AttemptAggregate(
                group.Count(),
                group.Where(attempt => attempt.MaximumScore > 0m)
                    .Average(attempt => attempt.Score / attempt.MaximumScore * 100m)))
            .SingleOrDefaultAsync(cancellationToken);

    private static string PeriodValue(StatisticsPeriod period) => period switch
    {
        StatisticsPeriod.Last30Days => "30d",
        StatisticsPeriod.Last90Days => "90d",
        StatisticsPeriod.All => "all",
        _ => throw new ArgumentOutOfRangeException(nameof(period))
    };

    private static string ModeValue(StatisticsModeFilter mode) => mode switch
    {
        StatisticsModeFilter.All => "all",
        StatisticsModeFilter.Practice => "practice",
        StatisticsModeFilter.Exam => "exam",
        _ => throw new ArgumentOutOfRangeException(nameof(mode))
    };

    private sealed record AttemptAggregate(
        int CompletedAttempts,
        decimal? AverageScorePercentage);

    private sealed record QuestionTypeAggregate(
        Domain.Exams.QuestionType QuestionType,
        decimal PointsEarned,
        decimal MaximumPoints,
        decimal? PointsPercentage,
        int AnsweredCount,
        int CorrectCount,
        int PartiallyCorrectCount,
        int IncorrectCount,
        int UnansweredCount);
}