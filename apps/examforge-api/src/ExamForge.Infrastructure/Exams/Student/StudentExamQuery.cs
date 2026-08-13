using ExamForge.Application.Student.ExamClassifications.Models;
using ExamForge.Application.Student.Exams.Abstractions;
using ExamForge.Application.Student.Exams.Enums;
using ExamForge.Application.Student.Exams.Models;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Exams.Student;

public sealed class StudentExamQuery : IStudentExamQuery
{
    private readonly ExamForgeDbContext _dbContext;

    public StudentExamQuery(ExamForgeDbContext dbContext) => _dbContext = dbContext;

    public async Task<StudentExamPageModel> GetPageAsync(
        StudentExamPageQuery request, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Exams
            .AsNoTracking()
            .StudentVisible();

        query = ApplySearch(query, request.Search);

        query = ApplyDiscoveryFilters(query, request.TagIds, request.Category);

        var totalItems = await query.CountAsync(cancellationToken);
        query = request.Sort == StudentExamSortOrder.Oldest
            ? query.OrderBy(exam => exam.CreatedAtUtc).ThenBy(exam => exam.Id)
            : query.OrderByDescending(exam => exam.CreatedAtUtc).ThenByDescending(exam => exam.Id);

        var cores = await query.Skip(request.Skip).Take(request.Take)
            .Select(exam => new StudentExamListCore(
                exam.Id, exam.Title, exam.Slug, exam.Description, exam.Type,
                exam.CreatedAtUtc, exam.UpdatedAtUtc,
                exam.Versions.Where(version => version.Status == ExamVersionStatus.Published)
                    .Select(version => new StudentPublishedVersionSummaryModel(
                        version.Id, version.VersionNumber, version.Title, version.DurationMinutes,
                        version.TotalScore, version.Sections.Count,
                        version.Sections.SelectMany(section => section.Questions)
                            .Count(question => question.Type != QuestionType.Group),
                        version.PublishedAtUtc!.Value)).Single()))
            .ToListAsync(cancellationToken);

        var examIds = cores.Select(item => item.Id).ToList();
        var tags = examIds.Count == 0
            ? []
            : await _dbContext.ExamTagMappings.AsNoTracking()
                .Where(mapping => examIds.Contains(mapping.ExamId) && !mapping.Tag.IsArchived)
                .OrderBy(mapping => mapping.Tag.Type).ThenBy(mapping => mapping.Tag.Name).ThenBy(mapping => mapping.Tag.Id)
                .Select(mapping => new ExamTagRow(mapping.ExamId,
                    new StudentExamTagModel(mapping.Tag.Id, mapping.Tag.Name, mapping.Tag.Slug, mapping.Tag.Type)))
                .ToListAsync(cancellationToken);
        var tagsByExam = tags.GroupBy(row => row.ExamId).ToDictionary(group => group.Key,
            group => (IReadOnlyList<StudentExamTagModel>)group.Select(row => row.Tag).ToList());

        return new StudentExamPageModel(cores.Select(core => new StudentExamListModel(
            core.Id, core.Title, core.Slug, core.Description, core.Type, core.CreatedAtUtc,
            core.UpdatedAtUtc, core.PublishedVersion, tagsByExam.GetValueOrDefault(core.Id, []))).ToList(), totalItems);
    }

    public Task<StudentPublishedExamModel?> GetPublishedExamAsync(
        string idOrSlug, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Exams.AsNoTracking().Where(exam => !exam.IsArchived);
        query = Guid.TryParse(idOrSlug, out var id)
            ? query.Where(exam => exam.Id == id)
            : query.Where(exam => exam.Slug == idOrSlug);
        return query.SelectMany(exam => exam.Versions
                .Where(version => version.Status == ExamVersionStatus.Published)
                .Select(version => new StudentPublishedExamModel(
                    exam.Id, exam.Title, exam.Slug, exam.Description, exam.Type,
                    exam.CreatedAtUtc, exam.UpdatedAtUtc,
                    version.Id, version.VersionNumber, version.Title, version.Description,
                    version.Instructions, version.DurationMinutes, version.TotalScore,
                    version.ContentRevision, version.PublishedAtUtc!.Value)))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<StudentExamTagModel>> GetActiveTagsAsync(
        Guid examId, CancellationToken cancellationToken = default) =>
        await _dbContext.ExamTagMappings.AsNoTracking()
            .Where(mapping => mapping.ExamId == examId && !mapping.Tag.IsArchived)
            .OrderBy(mapping => mapping.Tag.Type).ThenBy(mapping => mapping.Tag.Name).ThenBy(mapping => mapping.Tag.Id)
            .Select(mapping => new StudentExamTagModel(
                mapping.Tag.Id, mapping.Tag.Name, mapping.Tag.Slug, mapping.Tag.Type))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<StudentSectionModel>> GetSectionsAsync(
        Guid versionId, CancellationToken cancellationToken = default) =>
        await _dbContext.ExamSections.AsNoTracking()
            .Where(section => section.ExamVersionId == versionId)
            .OrderBy(section => section.DisplayOrder).ThenBy(section => section.Id)
            .Select(section => new StudentSectionModel(
                section.Id, section.Kind, section.Title, section.Instructions, section.StimulusText,
                section.MediaUrl, section.DisplayOrder,
                section.Questions.Count(question => question.Type != QuestionType.Group),
                section.Questions.Where(question => question.Type != QuestionType.Group).Sum(question => question.Points),
                section.MetadataJson))
            .ToListAsync(cancellationToken);

    private static string EscapeLikePattern(string value) => value
        .Replace("\\", "\\\\", StringComparison.Ordinal)
        .Replace("%", "\\%", StringComparison.Ordinal)
        .Replace("_", "\\_", StringComparison.Ordinal);

    private static IQueryable<Exam> ApplySearch(IQueryable<Exam> query, string? search)
    {
        if (search is null) return query;
        var pattern = $"%{EscapeLikePattern(search)}%";
        return query.Where(exam => EF.Functions.ILike(exam.Title, pattern, "\\"));
    }

    private static IQueryable<Exam> ApplyDiscoveryFilters(
        IQueryable<Exam> query,
        IReadOnlyCollection<Guid> tagIds,
        StudentExamCategoryRuleModel? category) =>
        query.ApplyCategoryRule(category).ApplySelectedTags(tagIds);

    private sealed record StudentExamListCore(
        Guid Id, string Title, string Slug, string Description, ExamType Type,
        DateTimeOffset CreatedAtUtc, DateTimeOffset? UpdatedAtUtc,
        StudentPublishedVersionSummaryModel PublishedVersion);
    private sealed record ExamTagRow(Guid ExamId, StudentExamTagModel Tag);
}
