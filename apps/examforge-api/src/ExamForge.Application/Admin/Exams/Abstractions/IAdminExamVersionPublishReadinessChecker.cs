using ExamForge.Application.Admin.Exams.Models;
namespace ExamForge.Application.Admin.Exams.Abstractions;

public interface IAdminExamVersionPublishReadinessChecker
{
    Task<bool> IsReadyAsync(
        Guid versionId,
        CancellationToken cancellationToken = default);
}