namespace ExamForge.Application.Admin.Exams.Models;

public sealed record NestedContentValidationError(string Path, string Code, string Message);