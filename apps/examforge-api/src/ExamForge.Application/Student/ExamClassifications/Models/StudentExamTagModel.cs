using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Student.ExamClassifications.Models;

public sealed record StudentExamTagModel(
    Guid Id,
    string Name,
    string Slug,
    string Description,
    ExamTagType Type,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);
