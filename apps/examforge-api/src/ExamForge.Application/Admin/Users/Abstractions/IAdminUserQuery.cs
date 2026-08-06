using ExamForge.Application.Admin.Users.Models;

namespace ExamForge.Application.Admin.Users.Abstractions;

public interface IAdminUserQuery
{
    Task<AdminUserPageModel> GetPageAsync(
        AdminUserPageQuery query,
        CancellationToken cancellationToken = default);
    Task<AdminUserModel?> GetByIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
    Task<AdminUserStatisticsModel> GetStatisticsAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}