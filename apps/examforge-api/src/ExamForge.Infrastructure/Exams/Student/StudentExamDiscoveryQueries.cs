using ExamForge.Application.Student.ExamClassifications.Models;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Domain.Exams;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Exams.Student;

internal static class StudentExamDiscoveryQueries
{
    public static IQueryable<Exam> StudentVisible(this IQueryable<Exam> exams) =>
        exams.Where(exam =>
            !exam.IsArchived &&
            exam.Versions.Any(version =>
                version.Status == ExamVersionStatus.Published));

    public static IQueryable<ExamCategory> ValidCategoryRules(
        this ExamForgeDbContext dbContext) =>
        dbContext.ExamCategories
            .AsNoTracking()
            .Where(category =>
                !category.IsArchived &&
                category.ExamCategoryTags.Any() &&
                !category.ExamCategoryTags.Any(categoryTag =>
                    categoryTag.ExamTag.IsArchived));

    public static IQueryable<Exam> ApplyCategoryRule(
        this IQueryable<Exam> exams,
        StudentExamCategoryRuleModel? category)
    {
        if (category is null)
        {
            return exams;
        }

        var categoryTagIds = category.TagIds;
        return category.MatchMode == ExamCategoryMatchMode.All
            ? exams.Where(exam => exam.ExamTagMappings
                .Where(mapping => categoryTagIds.Contains(mapping.ExamTagId))
                .Select(mapping => mapping.ExamTagId)
                .Distinct()
                .Count() == categoryTagIds.Count)
            : exams.Where(exam => exam.ExamTagMappings.Any(mapping =>
                categoryTagIds.Contains(mapping.ExamTagId)));
    }

    public static IQueryable<Exam> ApplySelectedTags(
        this IQueryable<Exam> exams,
        IReadOnlyCollection<Guid> tagIds)
    {
        if (tagIds.Count == 0)
        {
            return exams;
        }

        return exams.Where(exam => exam.ExamTagMappings
            .Where(mapping => tagIds.Contains(mapping.ExamTagId))
            .Select(mapping => mapping.ExamTagId)
            .Distinct()
            .Count() == tagIds.Count);
    }
}