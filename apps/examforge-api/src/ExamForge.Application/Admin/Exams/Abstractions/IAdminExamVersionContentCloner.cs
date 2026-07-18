using ExamForge.Application.Admin.Exams.Utils;
namespace ExamForge.Application.Admin.Exams.Abstractions;

public interface IAdminExamVersionContentCloner
{
    Task<ExamVersionContentClonePlan> CloneAsync(
        Guid sourceVersionId,
        Guid targetVersionId,
        CancellationToken cancellationToken = default);
}