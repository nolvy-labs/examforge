using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Admin.Exams.Utils;

namespace ExamForge.Application.Admin.Exams.Services;

public sealed class NestedExamContentPersistence
{
    private readonly IAdminExamSectionRepository _sections;
    private readonly IAdminQuestionRepository _questions;
    private readonly IAdminQuestionOptionRepository _options;
    private readonly IAdminFillAnswerKeyRepository _answerKeys;

    public NestedExamContentPersistence(
        IAdminExamSectionRepository sections,
        IAdminQuestionRepository questions,
        IAdminQuestionOptionRepository options,
        IAdminFillAnswerKeyRepository answerKeys)
    {
        _sections = sections;
        _questions = questions;
        _options = options;
        _answerKeys = answerKeys;
    }

    public void Add(CreatedExamContentGraph graph)
    {
        foreach (var section in graph.Sections) _sections.Add(section);
        foreach (var question in graph.Questions) _questions.Add(question);
        foreach (var option in graph.Options) _options.Add(option);
        foreach (var answerKey in graph.AnswerKeys) _answerKeys.Add(answerKey);
    }

    public void Add(CreatedQuestionGraph graph)
    {
        _questions.Add(graph.Question);
        foreach (var option in graph.Options) _options.Add(option);
        foreach (var answerKey in graph.AnswerKeys) _answerKeys.Add(answerKey);
        foreach (var child in graph.Children) Add(child);
    }
}