using ExamForge.Application.Admin.Exams.Models;
namespace ExamForge.Application.Admin.Exams.Abstractions;

public interface IAdminExamVersionContentCloner
{
    Task CloneAsync(
        Guid sourceVersionId,
        Guid targetVersionId,
        CancellationToken cancellationToken = default);
}
