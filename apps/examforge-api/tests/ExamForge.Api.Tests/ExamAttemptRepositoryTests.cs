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
    public async Task Page_filter_combines_exam_student_and_state_before_pagination()
    {
        var data = await SeedPageDataAsync();
        await using var context = data.Context;
        var repository = new ExamAttemptRepository(context);

        var active = await repository.GetPageAsync(
            data.StudentId,
            false,
            data.ExamId,
            0,
            20);
        var completed = await repository.GetPageAsync(
            data.StudentId,
            true,
            data.ExamId,
            0,
            20);
        var firstCompletedPage = await repository.GetPageAsync(
            data.StudentId,
            true,
            data.ExamId,
            0,
            1);

        Assert.Equal(1, active.TotalItems);
        Assert.All(active.Items, item =>
        {
            Assert.Equal(data.ExamId, item.ExamId);
            Assert.Equal(ExamAttemptStatus.InProgress, item.Status);
        });
        Assert.Equal(2, completed.TotalItems);
        Assert.Contains(completed.Items, item => item.Status == ExamAttemptStatus.Submitted);
        Assert.Contains(completed.Items, item => item.Status == ExamAttemptStatus.Abandoned);
        Assert.Single(firstCompletedPage.Items);
        Assert.Equal(2, firstCompletedPage.TotalItems);
        Assert.Equal(data.LatestCompletedAttemptId, firstCompletedPage.Items[0].AttemptId);
    }

    [Fact]
    public async Task Page_without_exam_filter_preserves_all_owned_attempts()
    {
        var data = await SeedPageDataAsync();
        await using var context = data.Context;
        var repository = new ExamAttemptRepository(context);

        var active = await repository.GetPageAsync(
            data.StudentId,
            false,
            null,
            0,
            20);
        var completed = await repository.GetPageAsync(
            data.StudentId,
            true,
            null,
            0,
            20);

        Assert.Equal(2, active.TotalItems);
        Assert.Equal(3, completed.TotalItems);
        Assert.DoesNotContain(active.Items, item => item.AttemptId == data.OtherStudentAttemptId);
        Assert.DoesNotContain(completed.Items, item => item.AttemptId == data.OtherStudentAttemptId);
    }

    [Fact]
    public async Task Page_filter_for_unknown_exam_returns_empty_page()
    {
        var data = await SeedPageDataAsync();
        await using var context = data.Context;
        var repository = new ExamAttemptRepository(context);

        var page = await repository.GetPageAsync(
            data.StudentId,
            true,
            Guid.NewGuid(),
            0,
            5);

        Assert.Empty(page.Items);
        Assert.Equal(0, page.TotalItems);
    }

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

    private static async Task<PageTestData> SeedPageDataAsync()
    {
        var options = new DbContextOptionsBuilder<ExamForgeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var context = new ExamForgeDbContext(options);
        var student = new User("student@example.com", "hash", "Student", UserRole.Student);
        var otherStudent = new User("other@example.com", "hash", "Other", UserRole.Student);
        var author = new User("author@example.com", "hash", "Author", UserRole.Admin);
        var firstExam = new Exam("First Exam", "first-exam", null, ExamType.Simple);
        var secondExam = new Exam("Second Exam", "second-exam", null, ExamType.Simple);
        var firstVersion = new ExamVersion(
            firstExam.Id, 1, "First", null, null, null, author.Id);
        var secondVersion = new ExamVersion(
            secondExam.Id, 1, "Second", null, null, null, author.Id);
        firstVersion.InitializeTotalScore(0m);
        secondVersion.InitializeTotalScore(0m);
        firstVersion.Publish(DateTimeOffset.Parse("2026-07-26T00:00:00Z"));
        secondVersion.Publish(DateTimeOffset.Parse("2026-07-26T00:00:00Z"));

        var firstActive = NewAttempt(student.Id, firstExam.Id, firstVersion.Id, 1);
        var firstSubmitted = NewAttempt(student.Id, firstExam.Id, firstVersion.Id, 2);
        firstSubmitted.Submit([], 0m, 0m, AtMinute(3));
        var firstAbandoned = NewAttempt(student.Id, firstExam.Id, firstVersion.Id, 4);
        firstAbandoned.Abandon(AtMinute(5));
        var secondActive = NewAttempt(student.Id, secondExam.Id, secondVersion.Id, 6);
        var secondSubmitted = NewAttempt(student.Id, secondExam.Id, secondVersion.Id, 7);
        secondSubmitted.Submit([], 0m, 0m, AtMinute(8));
        var otherStudentAttempt = NewAttempt(
            otherStudent.Id, firstExam.Id, firstVersion.Id, 9);
        otherStudentAttempt.Submit([], 0m, 0m, AtMinute(10));
        var otherStudentActive = NewAttempt(
            otherStudent.Id, firstExam.Id, firstVersion.Id, 11);

        context.AddRange(
            student,
            otherStudent,
            author,
            firstExam,
            secondExam,
            firstVersion,
            secondVersion,
            firstActive,
            firstSubmitted,
            firstAbandoned,
            secondActive,
            secondSubmitted,
            otherStudentAttempt,
            otherStudentActive);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        return new PageTestData(
            context,
            student.Id,
            firstExam.Id,
            firstAbandoned.Id,
            otherStudentAttempt.Id);
    }

    private static ExamAttempt NewAttempt(
        Guid studentId,
        Guid examId,
        Guid versionId,
        int minute) =>
        new(studentId, examId, versionId, AtMinute(minute), null, []);

    private static DateTimeOffset AtMinute(int minute) =>
        DateTimeOffset.Parse("2026-07-26T00:00:00Z").AddMinutes(minute);

    private sealed record PageTestData(
        ExamForgeDbContext Context,
        Guid StudentId,
        Guid ExamId,
        Guid LatestCompletedAttemptId,
        Guid OtherStudentAttemptId);
}