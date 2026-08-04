using System.Reflection;

using ExamForge.Api.Controllers.Student.Statistics;
using ExamForge.Application.Abstractions;
using ExamForge.Application.Student.Statistics.Abstractions;
using ExamForge.Application.Student.Statistics.Enums;
using ExamForge.Application.Student.Statistics.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Tests;

public sealed class StatisticsApiContractTests
{
    [Fact]
    public void EndpointsAreAuthenticatedAndNeverAcceptStudentId()
    {
        var controller = typeof(StatisticsController);
        Assert.Single(controller.GetCustomAttributes<AuthorizeAttribute>());
        Assert.All(controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Where(method => method.Name.StartsWith("Get", StringComparison.Ordinal)),
            method => Assert.DoesNotContain(method.GetParameters(), parameter => parameter.Name?.Contains("student", StringComparison.OrdinalIgnoreCase) == true));
        Assert.Equal("dashboard", controller.GetMethod(nameof(StatisticsController.GetDashboard))!.GetCustomAttribute<HttpGetAttribute>()!.Template);
        Assert.Null(controller.GetMethod(nameof(StatisticsController.GetStatistics))!.GetCustomAttribute<HttpGetAttribute>()!.Template);
    }

    [Theory]
    [InlineData("bad", "all", "invalid_statistics_period")]
    [InlineData("30d", "bad", "invalid_statistics_mode")]
    public async Task InvalidFiltersReturnProjectProblemDetails(string period, string mode, string code)
    {
        var controller = Controller(Guid.NewGuid());

        var result = await controller.GetStatistics(period, mode);

        var objectResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal(code, problem.Extensions["code"]);
    }

    [Fact]
    public async Task MissingPrincipalIdentifierReturnsUnauthorizedWithoutQuerying()
    {
        var query = new StubQuery();
        var controller = Controller(null, query);

        var result = await controller.GetDashboard(default);

        Assert.Equal(StatusCodes.Status401Unauthorized, Assert.IsType<ObjectResult>(result.Result).StatusCode);
        Assert.False(query.Called);
    }

    private static StatisticsController Controller(Guid? userId, StubQuery? query = null)
    {
        var controller = new StatisticsController(new StubCurrentUser(userId), query ?? new StubQuery());
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        return controller;
    }

    private sealed record StubCurrentUser(Guid? UserId) : ICurrentUserContext;

    private sealed class StubQuery : IStudentStatisticsQuery
    {
        public bool Called { get; private set; }
        public Task<DashboardStatisticsModel> GetDashboardAsync(Guid studentId, CancellationToken cancellationToken = default)
        {
            Called = true;
            return Task.FromResult(new DashboardStatisticsModel(0, null, 0));
        }

        public Task<StudentStatisticsModel> GetStatisticsAsync(Guid studentId, StatisticsPeriod period, StatisticsModeFilter mode, CancellationToken cancellationToken = default)
        {
            Called = true;
            throw new NotSupportedException();
        }
    }
}