using System.Text.Json;

using ExamForge.Domain.Users;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.ActionConstraints;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace ExamForge.Api.Tests;

public sealed class EndpointOperationContractTests
{
    private static readonly string[] RemovedOperations =
    [
        "GET api/v1/exam-categories/{slug}",
        "GET api/v1/exams/{idOrSlug}/full-test",
        "GET api/v1/exams/{idOrSlug}/first-section",
        "GET api/v1/exams/{idOrSlug}/sections/{sectionId:guid}",
        "GET api/v1/admin/exams/{examId:guid}/versions/published",
        "GET api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/{questionId:guid}/options",
        "GET api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/{questionId:guid}/options/{optionId:guid}",
        "GET api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/{questionId:guid}/answer-keys",
        "GET api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/{questionId:guid}/answer-keys/{answerKeyId:guid}"
    ];

    private static readonly string[] RetainedOperations =
    [
        "POST api/v1/auth/register",
        "POST api/v1/auth/login",
        "POST api/v1/auth/refresh",
        "POST api/v1/auth/logout",
        "GET api/v1/auth/me",
        "GET api/v1/exam-categories",
        "GET api/v1/exams/filters",
        "GET api/v1/exams",
        "GET api/v1/exams/{idOrSlug}",
        "POST api/v1/exams/{examId:guid}/attempts",
        "GET api/v1/exam-attempts/{attemptId:guid}",
        "GET api/v1/exam-attempts",
        "PATCH api/v1/exam-attempts/{attemptId:guid}",
        "POST api/v1/exam-attempts/{attemptId:guid}/submit",
        "POST api/v1/exam-attempts/{attemptId:guid}/abandon",
        "GET api/v1/statistics/dashboard",
        "GET api/v1/statistics",
        "GET api/v1/admin/users",
        "GET api/v1/admin/users/{userId:guid}",
        "GET api/v1/admin/exams/{examId:guid}/attempts",
        "GET api/v1/admin/users/{userId:guid}/attempts",
        "GET api/v1/admin/attempts/{attemptId:guid}",
        "GET api/v1/admin/exam-tags",
        "GET api/v1/admin/exam-tags/{id:guid}",
        "POST api/v1/admin/exam-tags",
        "PUT api/v1/admin/exam-tags/{id:guid}",
        "POST api/v1/admin/exam-tags/{id:guid}/archive",
        "POST api/v1/admin/exam-tags/{id:guid}/restore",
        "GET api/v1/admin/exam-categories",
        "GET api/v1/admin/exam-categories/{id:guid}",
        "POST api/v1/admin/exam-categories",
        "PUT api/v1/admin/exam-categories/{id:guid}",
        "DELETE api/v1/admin/exam-categories/{id:guid}",
        "POST api/v1/admin/exam-categories/{id:guid}/restore",
        "GET api/v1/admin/exams",
        "GET api/v1/admin/exams/{id:guid}",
        "POST api/v1/admin/exams",
        "PATCH api/v1/admin/exams/{id:guid}",
        "PUT api/v1/admin/exams/{id:guid}/tags",
        "DELETE api/v1/admin/exams/{id:guid}",
        "POST api/v1/admin/exams/{id:guid}/restore",
        "GET api/v1/admin/exams/{examId:guid}/versions",
        "GET api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}",
        "POST api/v1/admin/exams/{examId:guid}/versions",
        "PATCH api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}",
        "POST api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/content/batch",
        "POST api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/publish",
        "POST api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/retire",
        "DELETE api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}",
        "GET api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections",
        "GET api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}",
        "POST api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections",
        "PATCH api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}",
        "PUT api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/order",
        "DELETE api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}",
        "GET api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions",
        "GET api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/{questionId:guid}",
        "POST api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions",
        "PATCH api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/{questionId:guid}",
        "PUT api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/order",
        "DELETE api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/{questionId:guid}",
        "POST api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/{questionId:guid}/options",
        "PATCH api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/{questionId:guid}/options/{optionId:guid}",
        "PUT api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/{questionId:guid}/options/order",
        "DELETE api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/{questionId:guid}/options/{optionId:guid}",
        "POST api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/{questionId:guid}/answer-keys",
        "PATCH api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/{questionId:guid}/answer-keys/{answerKeyId:guid}",
        "DELETE api/v1/admin/exams/{examId:guid}/versions/{versionId:guid}/sections/{sectionId:guid}/questions/{questionId:guid}/answer-keys/{answerKeyId:guid}"
    ];

    [Fact]
    public void ControllerOperationSet_EqualsAuditedSetMinusApprovedRemovals()
    {
        using var factory = CreateFactory();
        var actions = GetControllerActions(factory);
        var actual = actions.SelectMany(ToOperations).Order().ToArray();

        Assert.Equal(68, actual.Length);
        Assert.Equal(RetainedOperations.Order(), actual);
        Assert.All(RemovedOperations, operation => Assert.DoesNotContain(operation, actual));
    }

    [Fact]
    public void RetainedAuthorizationMetadata_IsUnchanged()
    {
        using var factory = CreateFactory();
        var actions = GetControllerActions(factory);

        var adminActions = actions
            .Where(action => ToOperations(action).Any(operation =>
                operation.Contains(" api/v1/admin/", StringComparison.Ordinal)))
            .ToList();
        Assert.NotEmpty(adminActions);
        Assert.All(adminActions, action => Assert.Contains(
            action.EndpointMetadata.OfType<IAuthorizeData>(),
            metadata => metadata.Roles?.Split(',').Contains(nameof(UserRole.Admin)) == true));
        Assert.All(adminActions, action => Assert.Empty(
            action.EndpointMetadata.OfType<IAllowAnonymous>()));

        var actualAuthenticatedOperations = actions
            .Where(action => !ToOperations(action).Any(operation =>
                operation.Contains(" api/v1/admin/", StringComparison.Ordinal)))
            .Where(action => action.EndpointMetadata.OfType<IAuthorizeData>().Any())
            .SelectMany(ToOperations)
            .Order()
            .ToArray();
        Assert.Equal(new[]
        {
            "GET api/v1/auth/me",
            "GET api/v1/exam-attempts",
            "GET api/v1/statistics",
            "GET api/v1/statistics/dashboard"
        }.Order(), actualAuthenticatedOperations);
    }

    [Fact]
    public async Task DevelopmentOpenApi_ContainsOnlyRetainedControllerOperations()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/openapi/v1.json");
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());

        var actual = document.RootElement.GetProperty("paths")
            .EnumerateObject()
            .SelectMany(path => path.Value.EnumerateObject()
                .Where(operation => IsHttpMethod(operation.Name))
                .Select(operation =>
                    $"{operation.Name.ToUpperInvariant()} {path.Name.TrimStart('/')}"))
            .Order()
            .ToArray();

        Assert.Equal(RetainedOperations.Select(NormalizeOpenApiOperation).Order(), actual);
        Assert.All(RemovedOperations, operation =>
            Assert.DoesNotContain(NormalizeOpenApiOperation(operation), actual));
    }

    private static WebApplicationFactory<Program> CreateFactory() =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.UseSetting(
                "ConnectionStrings:DefaultConnection",
                "Host=localhost;Database=examforge_tests;Username=examforge;Password=examforge");
            builder.UseSetting("Jwt:Secret", new string('x', 64));
        });

    private static IReadOnlyList<ControllerActionDescriptor> GetControllerActions(
        WebApplicationFactory<Program> factory) =>
        factory.Services.GetRequiredService<IActionDescriptorCollectionProvider>()
            .ActionDescriptors.Items
            .OfType<ControllerActionDescriptor>()
            .ToList();

    private static IEnumerable<string> ToOperations(ControllerActionDescriptor action)
    {
        var route = action.AttributeRouteInfo?.Template?.TrimStart('~', '/');
        Assert.False(string.IsNullOrWhiteSpace(route));
        var constraint = Assert.Single(action.ActionConstraints!.OfType<HttpMethodActionConstraint>());
        return constraint.HttpMethods.Select(method => $"{method.ToUpperInvariant()} {route}");
    }

    private static bool IsHttpMethod(string value) => value is
        "get" or "post" or "put" or "patch" or "delete" or "head" or "options" or "trace";

    private static string NormalizeOpenApiOperation(string operation) =>
        operation.Replace(":guid", string.Empty, StringComparison.Ordinal);
}
