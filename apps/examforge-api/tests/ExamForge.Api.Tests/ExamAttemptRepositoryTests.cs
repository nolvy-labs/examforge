using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;
using ExamForge.Domain.Users;
using ExamForge.Infrastructure.ExamAttempts;
using ExamForge.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Api.Tests;

public sealed class ExamAttemptRepositoryTests
{
    [Fact]
    public async Task Persists_and_loads_frozen_attempt_graph_with_selected_options()
    {
        var options = new DbContextOptionsBuilder<ExamForgeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var student = new User(
            "student@example.com",
            "hash",
            "Student",
            UserRole.Student);
        var author = new User(
            "author@example.com",
            "hash",
            "Author",
            UserRole.Admin);
        var exam = new Exam("Exam", "exam", null, ExamType.Simple);
        var version = new ExamVersion(
            exam.Id,
            1,
            "Frozen version",
            null,
            null,
            30,
            author.Id);
        var section = new ExamSection(
            version.Id,
            ExamSectionKind.Default,
            "Section",
            null,
            null,
            null,
            0);
        var question = new Question(
            section.Id,
            null,
            QuestionType.MultipleChoiceSingle,
            "Question",
            "Explanation",
            2m,
            0);
        var option = new QuestionOption(
            question.Id,
            "Correct",
            "A",
            true,
            null,
            0);
        version.InitializeTotalScore(2m);
        version.Publish(DateTimeOffset.Parse("2026-07-26T00:00:00Z"));

        await using var context = new ExamForgeDbContext(options);
        context.AddRange(student, author, exam, version, section, question, option);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new ExamAttemptRepository(context);
        var published = await repository.GetPublishedVersionAsync(exam.Id);
        Assert.NotNull(published);
        var attempt = new ExamAttempt(
            student.Id,
            exam.Id,
            published.Id,
            DateTimeOffset.Parse("2026-07-26T00:05:00Z"),
            DateTimeOffset.Parse("2026-07-26T00:35:00Z"),
            [question.Id]);

        var create = await repository.AddAsync(attempt);
        Assert.True(create.Created);
        context.ChangeTracker.Clear();

        var loaded = await repository.GetOwnedAsync(attempt.Id, student.Id);
        loaded!.ApplyAnswers(
            [
                new ExamAttemptAnswerUpdate(
                    question.Id,
                    null,
                    [option.Id],
                    false,
                    true)
            ],
            DateTimeOffset.Parse("2026-07-26T00:10:00Z"));
        var save = await repository.SaveAsync(loaded);

        Assert.True(save.Saved);
        Assert.Equal(2, save.CurrentRevision);
        context.ChangeTracker.Clear();
        var reloaded = await repository.GetOwnedAsync(attempt.Id, student.Id);
        Assert.Equal("Frozen version", reloaded!.ExamVersion.Title);
        Assert.Equal(question.Id, Assert.Single(reloaded.Answers).Question.Id);
        Assert.Equal(
            option.Id,
            Assert.Single(reloaded.Answers.Single().SelectedOptions).QuestionOptionId);
    }
}
