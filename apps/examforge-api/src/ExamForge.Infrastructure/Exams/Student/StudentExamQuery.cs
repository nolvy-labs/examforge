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
        var query = _dbContext.Exams.AsNoTracking().Where(exam =>
            !exam.IsArchived && exam.Versions.Any(version => version.Status == ExamVersionStatus.Published));

        query = ApplySearch(query, request.Search);

        if (request.TagId.HasValue || request.TagSlug is not null)
        {
            Guid? tagId = request.TagId;
            if (!tagId.HasValue)
            {
                tagId = await _dbContext.ExamTags.AsNoTracking()
                    .Where(tag => !tag.IsArchived && tag.Type == request.TagType!.Value && tag.Slug == request.TagSlug)
                    .Select(tag => (Guid?)tag.Id).FirstOrDefaultAsync(cancellationToken);
            }
            else
            {
                tagId = await _dbContext.ExamTags.AsNoTracking()
                    .Where(tag => !tag.IsArchived && tag.Id == tagId.Value)
                    .Select(tag => (Guid?)tag.Id).FirstOrDefaultAsync(cancellationToken);
            }

            if (!tagId.HasValue) return new StudentExamPageModel([], 0);
            query = query.Where(exam => exam.ExamTagMappings.Any(mapping => mapping.ExamTagId == tagId.Value));
        }
        else if (request.CategoryId.HasValue || request.CategorySlug is not null)
        {
            var category = await _dbContext.ExamCategories.AsNoTracking()
                .Where(item => !item.IsArchived &&
                    (request.CategoryId.HasValue ? item.Id == request.CategoryId.Value : item.Slug == request.CategorySlug))
                .Select(item => new
                {
                    item.MatchMode,
                    TagIds = item.ExamCategoryTags.Where(categoryTag => !categoryTag.ExamTag.IsArchived)
                        .Select(categoryTag => categoryTag.ExamTagId).ToList()
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (category is null || category.TagIds.Count == 0) return new StudentExamPageModel([], 0);
            query = category.MatchMode == ExamCategoryMatchMode.All
                ? query.Where(exam => exam.ExamTagMappings.Count(mapping =>
                    category.TagIds.Contains(mapping.ExamTagId)) == category.TagIds.Count)
                : query.Where(exam => exam.ExamTagMappings.Any(mapping => category.TagIds.Contains(mapping.ExamTagId)));
        }

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

    public async Task<IReadOnlyList<StudentSectionIdentifierModel>> GetSectionIdentifiersAsync(
        Guid versionId, CancellationToken cancellationToken = default) =>
        await _dbContext.ExamSections.AsNoTracking()
            .Where(section => section.ExamVersionId == versionId)
            .OrderBy(section => section.DisplayOrder).ThenBy(section => section.Id)
            .Select(section => new StudentSectionIdentifierModel(section.Id, section.DisplayOrder))
            .ToListAsync(cancellationToken);

    public Task<StudentSectionModel?> GetSectionAsync(
        Guid versionId, Guid sectionId, CancellationToken cancellationToken = default) =>
        _dbContext.ExamSections.AsNoTracking()
            .Where(section => section.ExamVersionId == versionId && section.Id == sectionId)
            .Select(section => new StudentSectionModel(
                section.Id, section.Kind, section.Title, section.Instructions, section.StimulusText,
                section.MediaUrl, section.DisplayOrder,
                section.Questions.Count(question => question.Type != QuestionType.Group),
                section.Questions.Where(question => question.Type != QuestionType.Group).Sum(question => question.Points),
                section.MetadataJson))
            .SingleOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<StudentQuestionModel>> GetQuestionsAsync(
        IReadOnlyCollection<Guid> sectionIds, bool includeSolutions, CancellationToken cancellationToken = default)
    {
        if (sectionIds.Count == 0) return [];
        var query = _dbContext.Questions.AsNoTracking().Where(question => sectionIds.Contains(question.ExamSectionId))
            .OrderBy(question => question.ExamSectionId).ThenBy(question => question.DisplayOrder).ThenBy(question => question.Id);
        return includeSolutions
            ? await query.Select(question => new StudentQuestionModel(
                question.Id, question.ExamSectionId, question.ParentQuestionId, question.Type,
                question.Prompt, question.Explanation, question.Points, question.DisplayOrder, question.MetadataJson))
                .ToListAsync(cancellationToken)
            : await query.Select(question => new StudentQuestionModel(
                question.Id, question.ExamSectionId, question.ParentQuestionId, question.Type,
                question.Prompt, null, question.Points, question.DisplayOrder, question.MetadataJson))
                .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<StudentOptionModel>> GetOptionsAsync(
        IReadOnlyCollection<Guid> questionIds, CancellationToken cancellationToken = default)
    {
        if (questionIds.Count == 0) return [];
        return await _dbContext.QuestionOptions.AsNoTracking().Where(option => questionIds.Contains(option.QuestionId))
            .OrderBy(option => option.QuestionId).ThenBy(option => option.DisplayOrder).ThenBy(option => option.Id)
            .Select(option => new StudentOptionModel(
                option.Id, option.QuestionId, option.Label, option.Text, option.DisplayOrder))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<StudentOptionSolutionModel>> GetOptionSolutionsAsync(
        IReadOnlyCollection<Guid> questionIds, CancellationToken cancellationToken = default)
    {
        if (questionIds.Count == 0) return [];
        return await _dbContext.QuestionOptions.AsNoTracking().Where(option => questionIds.Contains(option.QuestionId))
            .OrderBy(option => option.QuestionId).ThenBy(option => option.DisplayOrder).ThenBy(option => option.Id)
            .Select(option => new StudentOptionSolutionModel(option.Id, option.IsCorrect, option.Explanation))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<StudentFillAnswerModel>> GetFillAnswersAsync(
        IReadOnlyCollection<Guid> questionIds, CancellationToken cancellationToken = default)
    {
        if (questionIds.Count == 0) return [];
        return await _dbContext.FillAnswerKeys.AsNoTracking().Where(answer => questionIds.Contains(answer.QuestionId))
            .OrderBy(answer => answer.QuestionId).ThenBy(answer => answer.DisplayOrder).ThenBy(answer => answer.Id)
            .Select(answer => new StudentFillAnswerModel(
                answer.QuestionId, answer.BlankKey, answer.AcceptedAnswer,
                answer.IsCaseSensitive, answer.DisplayOrder, answer.Id))
            .ToListAsync(cancellationToken);
    }

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

    private sealed record StudentExamListCore(
        Guid Id, string Title, string Slug, string Description, ExamType Type,
        DateTimeOffset CreatedAtUtc, DateTimeOffset? UpdatedAtUtc,
        StudentPublishedVersionSummaryModel PublishedVersion);
    private sealed record ExamTagRow(Guid ExamId, StudentExamTagModel Tag);
}
