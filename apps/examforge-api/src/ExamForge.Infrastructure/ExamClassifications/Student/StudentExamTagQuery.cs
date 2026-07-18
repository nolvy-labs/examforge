using ExamForge.Application.Student.ExamClassifications.Abstractions;
using ExamForge.Application.Student.ExamClassifications.Models;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.ExamClassifications.Student;

public sealed class StudentExamTagQuery : IStudentExamTagQuery
{
    private readonly ExamForgeDbContext _dbContext;

    public StudentExamTagQuery(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<StudentExamTagModel>> ListActiveAsync(
        ExamTagType? type,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ExamTags
            .AsNoTracking()
            .Where(tag => !tag.IsArchived);

        if (type.HasValue)
        {
            query = query.Where(tag => tag.Type == type.Value);
        }

        return await query
            .OrderBy(tag => tag.Type)
            .ThenBy(tag => tag.Name)
            .Select(ToModel())
            .ToListAsync(cancellationToken);
    }

    public Task<StudentExamTagModel?> GetActiveByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.ExamTags
            .AsNoTracking()
            .Where(tag => !tag.IsArchived && tag.Id == id)
            .Select(ToModel())
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<StudentExamTagModel?> GetActiveByTypeAndSlugAsync(
        ExamTagType type,
        string slug,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.ExamTags
            .AsNoTracking()
            .Where(tag =>
                !tag.IsArchived &&
                tag.Type == type &&
                tag.Slug == slug)
            .Select(ToModel())
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static System.Linq.Expressions.Expression<Func<ExamTag, StudentExamTagModel>> ToModel()
    {
        return tag => new StudentExamTagModel(
            tag.Id,
            tag.Name,
            tag.Slug,
            tag.Description,
            tag.Type,
            tag.CreatedAtUtc,
            tag.UpdatedAtUtc);
    }
}
