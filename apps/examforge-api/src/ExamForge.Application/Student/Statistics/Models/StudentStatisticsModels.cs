using ExamForge.Application.Student.Statistics.Enums;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Student.Statistics.Models;

public sealed record DashboardStatisticsModel(
    int CompletedAttempts,
    decimal? AverageScorePercentage,
    int QuestionsAnswered);

public sealed record StudentStatisticsModel(
    StatisticsFiltersModel Filters,
    DashboardStatisticsModel Overview,
    IReadOnlyList<ScoreTrendPointModel> ScoreTrend,
    IReadOnlyList<ExamPerformanceModel> PerformanceByExam,
    IReadOnlyList<QuestionTypePerformanceModel> PerformanceByQuestionType);

public sealed record StatisticsFiltersModel(
    string Period,
    string Mode,
    DateTimeOffset? FromUtc,
    DateTimeOffset ToUtc);

public sealed record ScoreTrendPointModel(
    Guid AttemptId,
    Guid ExamId,
    string ExamSlug,
    string ExamTitle,
    int VersionNumber,
    ExamAttemptMode Mode,
    DateTimeOffset SubmittedAtUtc,
    decimal ScorePercentage);

public sealed record ExamPerformanceModel(
    Guid ExamId,
    string ExamSlug,
    string ExamTitle,
    int AttemptCount,
    decimal? LatestScorePercentage,
    decimal? AverageScorePercentage,
    decimal? BestScorePercentage);

public sealed record QuestionTypePerformanceModel(
    QuestionType QuestionType,
    decimal PointsEarned,
    decimal MaximumPoints,
    decimal? PointsPercentage,
    int CorrectCount,
    int PartiallyCorrectCount,
    int IncorrectCount,
    int UnansweredCount);