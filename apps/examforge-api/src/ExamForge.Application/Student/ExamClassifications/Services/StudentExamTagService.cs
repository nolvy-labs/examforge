using ExamForge.Application.Common;
using ExamForge.Application.Student.ExamClassifications.Abstractions;
using ExamForge.Application.Student.ExamClassifications.Dtos;
using ExamForge.Application.Student.ExamClassifications.Errors;
using ExamForge.Application.Student.ExamClassifications.Models;
using ExamForge.Domain.Common;
using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Student.ExamClassifications.Services;

public sealed class StudentExamTagService
{
    private readonly IStudentExamTagQuery _examTags;

    public StudentExamTagService(IStudentExamTagQuery examTags)
    {
        _examTags = examTags;
    }

    public async Task<IReadOnlyList<StudentExamTagResponse>> ListActiveAsync(
        ExamTagType? type,
        CancellationToken cancellationToken = default)
    {
        var tags = await _examTags.ListActiveAsync(type, cancellationToken);
        return tags.Select(ToResponse).ToList();
    }

    public async Task<Result<StudentExamTagResponse, StudentExamTagError>> GetActiveByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var tag = await _examTags.GetActiveByIdAsync(id, cancellationToken);
        return tag is null
            ? Result<StudentExamTagResponse, StudentExamTagError>.Failure(StudentExamTagError.NotFound)
            : Result<StudentExamTagResponse, StudentExamTagError>.Success(ToResponse(tag));
    }

    public async Task<Result<StudentExamTagResponse, StudentExamTagError>> GetActiveByTypeAndSlugAsync(
        ExamTagType type,
        string slug,
        CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(type) || type == ExamTagType.Unknown)
        {
            return Result<StudentExamTagResponse, StudentExamTagError>.Failure(
                StudentExamTagError.InvalidType);
        }

        if (string.IsNullOrWhiteSpace(slug))
        {
            return Result<StudentExamTagResponse, StudentExamTagError>.Failure(
                StudentExamTagError.InvalidSlug);
        }

        var tag = await _examTags.GetActiveByTypeAndSlugAsync(
            type,
            TextNormalizer.NormalizeSlug(slug),
            cancellationToken);

        return tag is null
            ? Result<StudentExamTagResponse, StudentExamTagError>.Failure(StudentExamTagError.NotFound)
            : Result<StudentExamTagResponse, StudentExamTagError>.Success(ToResponse(tag));
    }

    private static StudentExamTagResponse ToResponse(StudentExamTagModel tag)
    {
        return new StudentExamTagResponse(
            tag.Id,
            tag.Name,
            tag.Slug,
            tag.Description,
            tag.Type,
            IsArchiced: false,
            tag.CreatedAtUtc,
            tag.UpdatedAtUtc);
    }
}
