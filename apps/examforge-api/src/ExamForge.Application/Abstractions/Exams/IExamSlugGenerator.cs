namespace ExamForge.Application.Abstractions;

public interface IExamSlugGenerator
{
    string Generate(string title);
}