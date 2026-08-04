using System.Reflection;

using ExamForge.Api.Controllers.Student.ExamAttempts;
using ExamForge.Application.Common;
using ExamForge.Application.Student.ExamAttempts.Dtos;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Infrastructure.Persistence;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace ExamForge.Api.Tests;

public sealed class ExamAttemptApiContractTests
{
    [Fact]
    public void Endpoints_are_student_authenticated_and_use_expected_routes()
    {
        var controller = typeof(ExamAttemptsController);

        var actions = controller.GetMethods(
                BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly)
            .ToDictionary(method => method.Name);
        Assert.Equal(
            "~/api/v1/exams/{examId:guid}/attempts",
            Assert.Single(actions["Create"].GetCustomAttributes<HttpPostAttribute>()).Template);
        Assert.Equal(
            "~/api/v1/exam-attempts/{attemptId:guid}",
            Assert.Single(actions["GetDetail"].GetCustomAttributes<HttpGetAttribute>()).Template);
        Assert.Equal(
            "~/api/v1/exam-attempts",
            Assert.Single(actions["GetPage"].GetCustomAttributes<HttpGetAttribute>()).Template);
        Assert.Single(actions["GetPage"].GetCustomAttributes<AuthorizeAttribute>());
        Assert.Equal(
            typeof(ActionResult<CollectionResponse<ExamAttemptListItemResponse>>),
            actions["GetPage"].ReturnType.GenericTypeArguments.Single());
        Assert.Equal(
            "~/api/v1/exam-attempts/{attemptId:guid}",
            Assert.Single(actions["Patch"].GetCustomAttributes<HttpPatchAttribute>()).Template);
        Assert.Equal(
            "~/api/v1/exam-attempts/{attemptId:guid}/submit",
            Assert.Single(actions["Submit"].GetCustomAttributes<HttpPostAttribute>()).Template);
        Assert.Equal(
            "~/api/v1/exam-attempts/{attemptId:guid}/abandon",
            Assert.Single(actions["Abandon"].GetCustomAttributes<HttpPostAttribute>()).Template);
        Assert.Equal(
            EmptyBodyBehavior.Allow,
            actions["Create"].GetParameters()[1].GetCustomAttribute<FromBodyAttribute>()!.EmptyBodyBehavior);
        Assert.DoesNotContain(
            actions["Submit"].GetParameters(),
            parameter => parameter.GetCustomAttribute<FromBodyAttribute>() is not null);
    }

    [Fact]
    public void Attempt_list_contract_uses_status_sort_and_both_timestamps()
    {
        var requestProperties = typeof(GetExamAttemptsRequest)
            .GetProperties()
            .Select(property => property.Name)
            .ToHashSet(StringComparer.Ordinal);
        Assert.Contains(nameof(GetExamAttemptsRequest.Status), requestProperties);
        Assert.Contains(nameof(GetExamAttemptsRequest.Sort), requestProperties);
        Assert.Contains(nameof(GetExamAttemptsRequest.ExamId), requestProperties);
        Assert.Contains(nameof(GetExamAttemptsRequest.Mode), requestProperties);
        Assert.DoesNotContain("State", requestProperties);

        var responseProperties = typeof(ExamAttemptListItemResponse)
            .GetProperties()
            .Select(property => property.Name)
            .ToHashSet(StringComparer.Ordinal);
        Assert.Contains(nameof(ExamAttemptListItemResponse.CreatedAtUtc), responseProperties);
        Assert.Contains(nameof(ExamAttemptListItemResponse.UpdatedAtUtc), responseProperties);
        Assert.Contains(nameof(ExamAttemptListItemResponse.ExamTitle), responseProperties);
        Assert.Contains(nameof(ExamAttemptListItemResponse.Score), responseProperties);
        Assert.Contains(nameof(ExamAttemptListItemResponse.Mode), responseProperties);
    }

    [Fact]
    public void Persistence_model_enforces_attempt_uniqueness_and_revision_concurrency()
    {
        var options = new DbContextOptionsBuilder<ExamForgeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var context = new ExamForgeDbContext(options);
        var attempt = context.Model.FindEntityType(typeof(ExamAttempt))!;

        Assert.True(attempt.FindProperty(nameof(ExamAttempt.Revision))!.IsConcurrencyToken);
        var activeIndex = attempt.GetIndexes().Single(
            index => index.GetDatabaseName() == "ux_exam_attempts_one_in_progress");
        Assert.True(activeIndex.IsUnique);
        Assert.Equal(
            "\"Status\" = 'InProgress'",
            activeIndex.GetFilter());
        Assert.Equal(
            [
                nameof(ExamAttempt.StudentId),
                nameof(ExamAttempt.ExamVersionId)
            ],
            activeIndex.Properties.Select(property => property.Name));

        var historyIndex = attempt.GetIndexes().Single(
            index => index.GetDatabaseName() == "ix_exam_attempts_student_status_history");
        Assert.Equal(
            [
                nameof(ExamAttempt.StudentId),
                nameof(ExamAttempt.Status),
                nameof(ExamAttempt.UpdatedAtUtc),
                nameof(ExamAttempt.Id)
            ],
            historyIndex.Properties.Select(property => property.Name));

        Assert.All(
            attempt.GetForeignKeys(),
            foreignKey => Assert.Equal(DeleteBehavior.Restrict, foreignKey.DeleteBehavior));
    }

    [Fact]
    public void Answer_and_selection_uniqueness_is_enforced()
    {
        var options = new DbContextOptionsBuilder<ExamForgeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var context = new ExamForgeDbContext(options);
        var answer = context.Model.FindEntityType(typeof(ExamAttemptAnswer))!;
        var answerIndex = answer.GetIndexes().Single(index =>
            index.Properties.Select(property => property.Name).SequenceEqual(
                [nameof(ExamAttemptAnswer.ExamAttemptId), nameof(ExamAttemptAnswer.QuestionId)]));
        Assert.True(answerIndex.IsUnique);

        var selection = context.Model.FindEntityType(typeof(ExamAttemptSelectedOption))!;
        Assert.Equal(
            [
                nameof(ExamAttemptSelectedOption.ExamAttemptAnswerId),
                nameof(ExamAttemptSelectedOption.QuestionOptionId)
            ],
            selection.FindPrimaryKey()!.Properties.Select(property => property.Name));
    }
}
