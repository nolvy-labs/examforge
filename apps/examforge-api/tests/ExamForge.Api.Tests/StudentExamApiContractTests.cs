using System.Reflection;

using ExamForge.Api.Controllers.Student.Exams;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Tests;

public sealed class StudentExamApiContractTests
{
    [Fact]
    public void StudentExamEndpoints_ArePublicAndUseRequiredRoutes()
    {
        var controller = typeof(ExamsController);
        Assert.Empty(controller.GetCustomAttributes<AuthorizeAttribute>(true));
        var actions = controller.GetMethods(BindingFlags.Instance | BindingFlags.Public)
            .Where(method => method.DeclaringType == controller).ToList();
        Assert.All(actions, action => Assert.Empty(action.GetCustomAttributes<AuthorizeAttribute>(true)));

        var templates = actions.SelectMany(action => action.GetCustomAttributes<HttpGetAttribute>())
            .Select(attribute => attribute.Template).ToHashSet();
        Assert.Contains(null, templates);
        Assert.Contains("{idOrSlug}", templates);
        Assert.Contains("{idOrSlug}/full-test", templates);
        Assert.Contains("{idOrSlug}/first-section", templates);
        Assert.Contains("{idOrSlug}/sections/{sectionId:guid}", templates);

        foreach (var actionName in new[] { "GetFullTest", "GetFirstSection", "GetSection" })
        {
            var parameter = actions.Single(action => action.Name == actionName)
                .GetParameters().Single(item => item.Name == "includeSolutions");
            Assert.Equal("include-solutions", parameter.GetCustomAttribute<FromQueryAttribute>()!.Name);
        }
    }
}