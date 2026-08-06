using System.Net;
using System.Reflection;

using ExamForge.Api.Common.Constants;
using ExamForge.Api.Controllers.Admin;
using ExamForge.Application.Admin.Users.Abstractions;
using ExamForge.Application.Admin.Users.Models;
using ExamForge.Domain.Users;
using ExamForge.Infrastructure.Auth;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ExamForge.Api.Tests;

public sealed class AdminManagementApiTests
{
    private const string Issuer = "ExamForge.Admin.Tests";
    private const string Audience = "ExamForge.Admin.Tests.Client";
    private const string Secret =
        "examforge-admin-tests-only-secret-that-is-at-least-64-characters-long";

    [Fact]
    public void Admin_management_routes_and_policy_are_declared()
    {
        var authorization = typeof(AdminBaseController)
            .GetCustomAttribute<AuthorizeAttribute>();
        Assert.Equal(nameof(UserRole.Admin), authorization!.Roles);

        var userActions = typeof(ExamForge.Api.Controllers.Admin.Users.UsersController)
            .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .ToDictionary(method => method.Name);
        Assert.Null(Assert.Single(userActions["GetPage"]
            .GetCustomAttributes<HttpGetAttribute>()).Template);
        Assert.Equal("{userId:guid}", Assert.Single(userActions["GetDetail"]
            .GetCustomAttributes<HttpGetAttribute>()).Template);

        var attemptActions = typeof(ExamForge.Api.Controllers.Admin.ExamAttempts.ExamAttemptsController)
            .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .ToDictionary(method => method.Name);
        Assert.Equal(
            "~/api/v1/admin/exams/{examId:guid}/attempts",
            Assert.Single(attemptActions["GetForExam"]
                .GetCustomAttributes<HttpGetAttribute>()).Template);
        Assert.Equal(
            "~/api/v1/admin/users/{userId:guid}/attempts",
            Assert.Single(attemptActions["GetForUser"]
                .GetCustomAttributes<HttpGetAttribute>()).Template);
        Assert.Equal(
            "~/api/v1/admin/attempts/{attemptId:guid}",
            Assert.Single(attemptActions["GetDetail"]
                .GetCustomAttributes<HttpGetAttribute>()).Template);
    }

    [Fact]
    public async Task User_list_requires_authentication()
    {
        await using var factory = CreateFactory();
        using var client = CreateClient(factory);

        using var response = await client.GetAsync("/api/v1/admin/users");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task User_list_forbids_students()
    {
        await using var factory = CreateFactory();
        using var client = CreateClient(factory);

        using var response = await SendAsync(
            client,
            new User("student@example.com", "hash", "Student", UserRole.Student));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task User_list_allows_administrators()
    {
        await using var factory = CreateFactory();
        using var client = CreateClient(factory);

        using var response = await SendAsync(
            client,
            new User("admin@example.com", "hash", "Admin", UserRole.Admin));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static WebApplicationFactory<Program> CreateFactory() =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.UseSetting(
                "ConnectionStrings:DefaultConnection",
                "Host=localhost;Database=examforge_tests;Username=examforge;Password=examforge");
            builder.UseSetting("Jwt:Issuer", Issuer);
            builder.UseSetting("Jwt:Audience", Audience);
            builder.UseSetting("Jwt:Secret", Secret);
            builder.ConfigureLogging(logging => logging.ClearProviders());
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IHostedService>();
                services.RemoveAll<IAdminUserQuery>();
                services.AddSingleton<IAdminUserQuery>(new FakeAdminUserQuery());
            });
        });

    private static HttpClient CreateClient(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = false
        });

    private static Task<HttpResponseMessage> SendAsync(HttpClient client, User user)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/users");
        var token = new JwtTokenService(Options.Create(new JwtOptions
        {
            Issuer = Issuer,
            Audience = Audience,
            Secret = Secret,
            AccessTokenMinutes = 15
        })).CreateAccessToken(user).Token;
        request.Headers.Add("Cookie", $"{AuthCookieNames.AccessToken}={token}");
        return client.SendAsync(request);
    }

    private sealed class FakeAdminUserQuery : IAdminUserQuery
    {
        public Task<AdminUserPageModel> GetPageAsync(
            AdminUserPageQuery query,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(new AdminUserPageModel([], 0));

        public Task<AdminUserModel?> GetByIdAsync(
            Guid userId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<AdminUserModel?>(null);

        public Task<AdminUserStatisticsModel> GetStatisticsAsync(
            Guid userId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(new AdminUserStatisticsModel(0, 0, 0, 0, 0, 0, null, null, 0, null));
    }
}