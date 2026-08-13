using System.Net;
using System.Reflection;

using ExamForge.Api.Controllers.Student.ExamClassifications;
using ExamForge.Api.Controllers.Student.Exams;
using ExamForge.Application.Student.ExamClassifications.Dtos;
using ExamForge.Application.Student.Exams.Dtos;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Logging;

namespace ExamForge.Api.Tests;

public sealed class StudentExamApiContractTests
{
    [Fact]
    public void StudentExamEndpoints_ArePublicAndUseRetainedRoutes()
    {
        var controller = typeof(ExamsController);
        Assert.Empty(controller.GetCustomAttributes<AuthorizeAttribute>(true));
        var actions = controller.GetMethods(BindingFlags.Instance | BindingFlags.Public)
            .Where(method => method.DeclaringType == controller).ToList();
        Assert.All(actions, action => Assert.Empty(action.GetCustomAttributes<AuthorizeAttribute>(true)));

        var templates = actions.SelectMany(action => action.GetCustomAttributes<HttpGetAttribute>())
            .Select(attribute => attribute.Template).ToHashSet();
        Assert.Contains(null, templates);
        Assert.Contains("filters", templates);
        Assert.Contains("{idOrSlug}", templates);
        Assert.Equal(3, templates.Count);
    }

    [Fact]
    public void StudentCategoryEndpoints_ArePublicAndExposeListOnly()
    {
        var controller = typeof(ExamCategoriesController);
        Assert.Empty(controller.GetCustomAttributes<AuthorizeAttribute>(true));
        var actions = controller.GetMethods(BindingFlags.Instance | BindingFlags.Public)
            .Where(method => method.DeclaringType == controller)
            .ToList();
        Assert.All(actions, action =>
            Assert.Empty(action.GetCustomAttributes<AuthorizeAttribute>(true)));

        var templates = actions
            .SelectMany(action => action.GetCustomAttributes<HttpGetAttribute>())
            .Select(attribute => attribute.Template)
            .ToList();
        Assert.Contains(null, templates);
        Assert.Single(templates);

        var featuredOnly = actions.Single(action => action.Name == "GetList")
            .GetParameters()
            .Single(parameter => parameter.Name == "featuredOnly");
        Assert.Equal(typeof(bool), featuredOnly.ParameterType);
        Assert.Equal(false, featuredOnly.DefaultValue);
    }

    [Fact]
    public void StudentDiscoveryContract_RemovesTagEndpointsAndAdminFields()
    {
        var apiAssembly = typeof(ExamsController).Assembly;
        Assert.DoesNotContain(apiAssembly.GetTypes(), type =>
            type.FullName ==
            "ExamForge.Api.Controllers.Student.ExamClassifications.ExamTagsController");

        var categoryFields = typeof(StudentExamCategoryResponse)
            .GetProperties()
            .Select(property => property.Name)
            .ToHashSet(StringComparer.Ordinal);
        Assert.DoesNotContain("MatchMode", categoryFields);
        Assert.DoesNotContain("DisplayOrder", categoryFields);
        Assert.DoesNotContain("CreatedAtUtc", categoryFields);
        Assert.DoesNotContain("UpdatedAtUtc", categoryFields);
        Assert.DoesNotContain("IsArchived", categoryFields);
    }

    [Fact]
    public void ExamListRequest_UsesRepeatedTagIdsAndCategorySlug()
    {
        var properties = typeof(GetStudentExamsRequest)
            .GetProperties()
            .ToDictionary(property => property.Name);

        Assert.Equal(typeof(IReadOnlyList<Guid>), properties["TagIds"].PropertyType);
        Assert.Equal(typeof(string), properties["CategorySlug"].PropertyType);
        Assert.DoesNotContain("TagId", properties.Keys);
        Assert.DoesNotContain("TagType", properties.Keys);
        Assert.DoesNotContain("TagSlug", properties.Keys);
        Assert.DoesNotContain("CategoryId", properties.Keys);
    }

    [Theory]
    [InlineData("/api/v1/exams?tagIds=not-a-guid")]
    [InlineData("/api/v1/exam-categories?featuredOnly=not-a-boolean")]
    public async Task MalformedDiscoveryQueryValues_ReturnAutomaticBadRequest(string url)
    {
        await using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment("Development");
                builder.UseSetting(
                    "ConnectionStrings:DefaultConnection",
                    "Host=localhost;Database=examforge_tests;Username=examforge;Password=examforge");
                builder.UseSetting("Jwt:Secret", new string('x', 64));
                builder.ConfigureLogging(logging => logging.ClearProviders());
            });
        using var client = factory.CreateClient();

        var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
