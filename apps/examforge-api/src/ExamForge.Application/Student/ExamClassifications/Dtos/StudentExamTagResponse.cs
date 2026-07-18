using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Student.ExamClassifications.Dtos;

public sealed record StudentExamTagResponse(
    Guid Id,
    string Name,
    string Slug,
    string Description,
    ExamTagType Type,
    bool IsArchiced,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);
