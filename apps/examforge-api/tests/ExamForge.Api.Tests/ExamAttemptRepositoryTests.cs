using System.Reflection;

using ExamForge.Application.Student.ExamAttempts.Enums;
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
    public async Task Page_filters_exact_status_exam_and_owner_before_pagination()
    {
        var data = await SeedPageDataAsync();
        await using var context = data.Context;
        var repository = new ExamAttemptRepository(context);

        var active = await repository.GetPageAsync(
            data.StudentId,
            ExamAttemptStatus.InProgress,
            data.ExamId,
            ExamAttemptSortOrder.CreatedAtDescending,
            0,
            20);
        var submitted = await repository.GetPageAsync(
            data.StudentId,
            ExamAttemptStatus.Submitted,
            data.ExamId,
            ExamAttemptSortOrder.CreatedAtDescending,
            0,
            20);
        var abandoned = await repository.GetPageAsync(
            data.StudentId,
            ExamAttemptStatus.Abandoned,
            data.ExamId,
            ExamAttemptSortOrder.CreatedAtDescending,
            0,
            20);

        Assert.Equal(1, active.TotalItems);
        Assert.All(active.Items, item =>
        {
            Assert.Equal(data.ExamId, item.ExamId);
            Assert.Equal(ExamAttemptStatus.InProgress, item.Status);
        });
        Assert.Single(submitted.Items);
        Assert.Equal(ExamAttemptStatus.Submitted, submitted.Items[0].Status);
        Assert.Single(abandoned.Items);
        Assert.Equal(ExamAttemptStatus.Abandoned, abandoned.Items[0].Status);
        Assert.DoesNotContain(submitted.Items, item => item.Status == ExamAttemptStatus.Abandoned);
        Assert.DoesNotContain(abandoned.Items, item => item.Status == ExamAttemptStatus.Submitted);
    }

    [Fact]
    public async Task Page_without_status_or_exam_filter_returns_all_owned_statuses()
    {
        var data = await SeedPageDataAsync();
        await using var context = data.Context;
        var repository = new ExamAttemptRepository(context);

        var page = await repository.GetPageAsync(
            data.StudentId,
            null,
            null,
            ExamAttemptSortOrder.CreatedAtDescending,
            0,
            20);

        Assert.Equal(5, page.TotalItems);
        Assert.Contains(page.Items, item => item.Status == ExamAttemptStatus.InProgress);
        Assert.Contains(page.Items, item => item.Status == ExamAttemptStatus.Submitted);
        Assert.Contains(page.Items, item => item.Status == ExamAttemptStatus.Abandoned);
        Assert.DoesNotContain(page.Items, item => item.AttemptId == data.OtherStudentAttemptId);
        Assert.DoesNotContain(page.Items, item => item.AttemptId == data.OtherStudentActiveId);
    }

    [Fact]
    public async Task Page_filter_for_unknown_exam_returns_empty_page()
    {
        var data = await SeedPageDataAsync();
        await using var context = data.Context;
        var repository = new ExamAttemptRepository(context);

        var page = await repository.GetPageAsync(
            data.StudentId,
            null,
            Guid.NewGuid(),
            ExamAttemptSortOrder.CreatedAtDescending,
            0,
            5);

        Assert.Empty(page.Items);
        Assert.Equal(0, page.TotalItems);
    }

    [Fact]
    public async Task Page_filters_by_exam_without_status()
    {
        var data = await SeedPageDataAsync();
        await using var context = data.Context;
        var repository = new ExamAttemptRepository(context);

        var page = await repository.GetPageAsync(
            data.StudentId,
            null,
            data.ExamId,
            ExamAttemptSortOrder.CreatedAtDescending,
            0,
            20);

        Assert.Equal(3, page.TotalItems);
        Assert.All(page.Items, item => Assert.Equal(data.ExamId, item.ExamId));
        Assert.Equal(
            [ExamAttemptStatus.Abandoned, ExamAttemptStatus.Submitted, ExamAttemptStatus.InProgress],
            page.Items.Select(item => item.Status));
    }

    [Fact]
    public async Task Page_sorts_by_created_at_in_both_directions_before_paging()
    {
        var data = await SeedPageDataAsync();
        await using var context = data.Context;
        var repository = new ExamAttemptRepository(context);

        var descending = await repository.GetPageAsync(
            data.StudentId,
            null,
            null,
            ExamAttemptSortOrder.CreatedAtDescending,
            1,
            2);
        var ascending = await repository.GetPageAsync(
            data.StudentId,
            null,
            null,
            ExamAttemptSortOrder.CreatedAtAscending,
            1,
            2);

        Assert.Equal([6, 4], descending.Items.Select(item => item.CreatedAtUtc.Minute));
        Assert.Equal([2, 4], ascending.Items.Select(item => item.CreatedAtUtc.Minute));
        Assert.Equal(5, descending.TotalItems);
        Assert.Equal(5, ascending.TotalItems);
    }

    [Fact]
    public async Task Page_uses_id_tie_breaker_for_equal_creation_times()
    {
        var data = await SeedPageDataAsync();
        await using var context = data.Context;
        var tied = await context.ExamAttempts
            .Where(attempt => attempt.StudentId == data.StudentId)
            .Take(2)
            .ToListAsync();
        var timestamp = DateTimeOffset.Parse("2026-07-26T03:00:00Z");
        foreach (var attempt in tied)
        {
            SetProperty(attempt, nameof(ExamAttempt.CreatedAtUtc), timestamp);
        }

        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();
        var repository = new ExamAttemptRepository(context);

        var descending = await repository.GetPageAsync(
            data.StudentId,
            null,
            null,
            ExamAttemptSortOrder.CreatedAtDescending,
            0,
            2);
        var ascending = await repository.GetPageAsync(
            data.StudentId,
            null,
            null,
            ExamAttemptSortOrder.CreatedAtAscending,
            3,
            2);

        Assert.Equal(
            tied.Select(attempt => attempt.Id).OrderDescending(),
            descending.Items.Select(item => item.AttemptId));
        Assert.Equal(
            tied.Select(attempt => attempt.Id).Order(),
            ascending.Items.Select(item => item.AttemptId));
    }

    [Fact]
    public async Task Page_ignores_updated_at_when_ordering_and_projects_both_timestamps()
    {
        var data = await SeedPageDataAsync();
        await using var context = data.Context;
        var older = await context.ExamAttempts.SingleAsync(
            attempt => attempt.Id == data.FirstSubmittedAttemptId);
        SetProperty(
            older,
            nameof(ExamAttempt.UpdatedAtUtc),
            DateTimeOffset.Parse("2026-07-27T00:00:00Z"));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();
        var repository = new ExamAttemptRepository(context);

        var page = await repository.GetPageAsync(
            data.StudentId,
            null,
            data.ExamId,
            ExamAttemptSortOrder.CreatedAtDescending,
            0,
            20);

        Assert.Equal(data.LatestCreatedAttemptId, page.Items[0].AttemptId);
        var item = page.Items.Single(candidate => candidate.AttemptId == older.Id);
        Assert.Equal(older.CreatedAtUtc, item.CreatedAtUtc);
        Assert.Equal(DateTimeOffset.Parse("2026-07-27T00:00:00Z"), item.UpdatedAtUtc);
    }

    [Fact]
    public async Task Expired_query_is_scoped_to_owner()
    {
        var data = await SeedPageDataAsync();
        await using var context = data.Context;
        var deadline = DateTimeOffset.Parse("2026-07-27T00:00:00Z");
        var attempts = await context.ExamAttempts
            .Where(attempt => attempt.Status == ExamAttemptStatus.InProgress)
            .ToListAsync();
        foreach (var attempt in attempts)
        {
            SetProperty(attempt, nameof(ExamAttempt.ExpiresAtUtc), deadline.AddMinutes(-1));
        }

        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();
        var repository = new ExamAttemptRepository(context);

        var expired = await repository.GetExpiredAsync(data.StudentId, deadline);

        Assert.Equal(2, expired.Count);
        Assert.All(expired, attempt => Assert.Equal(data.StudentId, attempt.StudentId));
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
            firstSubmitted.Id,
            firstAbandoned.Id,
            otherStudentAttempt.Id,
            otherStudentActive.Id);
    }

    private static ExamAttempt NewAttempt(
        Guid studentId,
        Guid examId,
        Guid versionId,
        int minute) =>
        new(studentId, examId, versionId, AtMinute(minute), null, []);

    private static DateTimeOffset AtMinute(int minute) =>
        DateTimeOffset.Parse("2026-07-26T00:00:00Z").AddMinutes(minute);

    private static void SetProperty<T>(
        object target,
        string propertyName,
        T value) =>
        target.GetType()
            .GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public)!
            .SetValue(target, value);

    private sealed record PageTestData(
        ExamForgeDbContext Context,
        Guid StudentId,
        Guid ExamId,
        Guid FirstSubmittedAttemptId,
        Guid LatestCreatedAttemptId,
        Guid OtherStudentAttemptId,
        Guid OtherStudentActiveId);
}