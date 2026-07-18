using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Application.Admin.ExamClassifications.Dtos;

public sealed record CreateExamTagRequest(
    string Name,
    string? Slug,
    string Description,
    ExamTagType Type
);

public sealed record UpdateExamTagRequest(
    string? Name,
    string? Slug,
    string? Description,
    ExamTagType? Type
);

public sealed record ExamTagResponse(
    Guid Id,
    string Name,
    string Slug,
    string Description,
    ExamTagType Type,
    bool IsArchiced,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc
);
