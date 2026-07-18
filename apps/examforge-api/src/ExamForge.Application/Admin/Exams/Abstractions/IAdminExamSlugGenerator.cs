using ExamForge.Application.Admin.Exams.Models;
namespace ExamForge.Application.Admin.Exams.Abstractions;

public interface IAdminExamSlugGenerator
{
    string Generate(string title);
}