using ExamForge.Application.Student.Statistics.Enums;
using ExamForge.Application.Student.Statistics.Models;

namespace ExamForge.Application.Student.Statistics.Abstractions;

public interface IStudentStatisticsQuery
{
    Task<DashboardStatisticsModel> GetDashboardAsync(
        Guid studentId,
        CancellationToken cancellationToken = default);

    Task<StudentStatisticsModel> GetStatisticsAsync(
        Guid studentId,
        StatisticsPeriod period,
        StatisticsModeFilter mode,
        CancellationToken cancellationToken = default);
}