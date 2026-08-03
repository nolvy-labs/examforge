using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

using ExamForge.Api.Common.Constants;
using ExamForge.Application.Student.ExamAttempts.Abstractions;
using ExamForge.Application.Student.ExamAttempts.Enums;
using ExamForge.Application.Student.ExamAttempts.Models;
using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;
using ExamForge.Domain.Users;
using ExamForge.Infrastructure.Auth;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ExamForge.Api.Tests;

public sealed class ExamAttemptListApiTests
{
    private const string Issuer = "ExamForge.Tests";
    private const string Audience = "ExamForge.Tests.Client";
    private const string Secret =
        "examforge-tests-only-secret-that-is-at-least-64-characters-long-123456789";

    [Fact]
    public async Task List_requires_authentication()
    {
        await using var factory = CreateFactory(new FakeRepository());
        using var client = CreateClient(factory);

        using var response = await client.GetAsync("/api/v1/exam-attempts");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task List_preserves_invalid_principal_unauthorized_problem()
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, "not-a-guid"),
            new Claim(JwtRegisteredClaimNames.Email, "student@example.com"),
            new Claim(ClaimTypes.Role, nameof(UserRole.Student)),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        await using var factory = CreateFactory(new FakeRepository());
        using var client = CreateClient(factory);

        using var response = await SendAsync(
            client,
            "/api/v1/exam-attempts",
            CreateToken(claims));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("current_user_unavailable", await ReadProblemCodeAsync(response));
    }

    [Theory]
    [InlineData("/api/v1/exam-attempts?status=completed", "invalid_attempt_status")]
    [InlineData("/api/v1/exam-attempts?status=unknown", "invalid_attempt_status")]
    [InlineData("/api/v1/exam-attempts?status=", "invalid_attempt_status")]
    [InlineData("/api/v1/exam-attempts?sort=updated-at-desc", "invalid_attempt_sort")]
    [InlineData("/api/v1/exam-attempts?sort=", "invalid_attempt_sort")]
    [InlineData("/api/v1/exam-attempts?page=0", "invalid_page")]
    [InlineData("/api/v1/exam-attempts?page=", "invalid_page")]
    [InlineData("/api/v1/exam-attempts?page=not-a-number", "invalid_page")]
    [InlineData("/api/v1/exam-attempts?pageSize=0", "invalid_page_size")]
    [InlineData("/api/v1/exam-attempts?pageSize=", "invalid_page_size")]
    [InlineData("/api/v1/exam-attempts?pageSize=not-a-number", "invalid_page_size")]
    [InlineData("/api/v1/exam-attempts?pageSize=-1", "invalid_page_size")]
    [InlineData("/api/v1/exam-attempts?pageSize=101", "invalid_page_size")]
    public async Task Invalid_query_returns_stable_problem_code(
        string url,
        string expectedCode)
    {
        var user = Student();
        await using var factory = CreateFactory(new FakeRepository());
        using var client = CreateClient(factory);

        using var response = await SendAsync(
            client,
            url,
            CreateTokenService().CreateAccessToken(user).Token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(expectedCode, await ReadProblemCodeAsync(response));
    }

    [Fact]
    public async Task List_omitted_filters_use_all_statuses_and_default_sort()
    {
        var user = Student();
        var repository = new FakeRepository();
        await using var factory = CreateFactory(repository);
        using var client = CreateClient(factory);

        using var response = await SendAsync(
            client,
            "/api/v1/exam-attempts",
            CreateTokenService().CreateAccessToken(user).Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Null(repository.LastStatus);
        Assert.Null(repository.LastExamId);
        Assert.Equal(ExamAttemptSortOrder.CreatedAtDescending, repository.LastSort);
        Assert.Equal(0, repository.LastSkip);
        Assert.Equal(20, repository.LastTake);
    }

    [Fact]
    public async Task List_binds_composable_query_and_returns_existing_collection_shape()
    {
        var user = Student();
        var examId = Guid.NewGuid();
        var createdAt = DateTimeOffset.Parse("2026-07-26T00:00:00Z");
        var updatedAt = createdAt.AddMinutes(5);
        var repository = new FakeRepository
        {
            Page = new ExamAttemptPageModel(
                [new ExamAttemptListModel(
                    Guid.NewGuid(),
                    examId,
                    Guid.NewGuid(),
                    "Exam",
                    "exam",
                    ExamAttemptStatus.Submitted,
                    createdAt,
                    null,
                    updatedAt,
                    null,
                    8m,
                    10m,
                    2,
                    createdAt,
                    updatedAt)],
                21)
        };
        await using var factory = CreateFactory(repository);
        using var client = CreateClient(factory);
        var url = $"/api/v1/exam-attempts?status=submitted&examId={examId:D}" +
            "&sort=created-at-asc&page=2&pageSize=20";

        using var response = await SendAsync(
            client,
            url,
            CreateTokenService().CreateAccessToken(user).Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(user.Id, repository.LastStudentId);
        Assert.Equal(ExamAttemptStatus.Submitted, repository.LastStatus);
        Assert.Equal(examId, repository.LastExamId);
        Assert.Equal(ExamAttemptSortOrder.CreatedAtAscending, repository.LastSort);
        Assert.Equal(20, repository.LastSkip);
        Assert.Equal(20, repository.LastTake);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        var root = document.RootElement;
        var item = root.GetProperty("items")[0];
        Assert.Equal(createdAt, item.GetProperty("createdAtUtc").GetDateTimeOffset());
        Assert.Equal(updatedAt, item.GetProperty("updatedAtUtc").GetDateTimeOffset());
        var meta = root.GetProperty("meta");
        Assert.Equal(2, meta.GetProperty("page").GetInt32());
        Assert.Equal(20, meta.GetProperty("pageSize").GetInt32());
        Assert.Equal(21, meta.GetProperty("totalItems").GetInt32());
        Assert.Equal(2, meta.GetProperty("totalPages").GetInt32());
    }

    private static User Student() =>
        new("student@example.com", "password-hash", "Student", UserRole.Student);

    private static HttpClient CreateClient(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = false
        });

    private static async Task<HttpResponseMessage> SendAsync(
        HttpClient client,
        string url,
        string token)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("Cookie", $"{AuthCookieNames.AccessToken}={token}");
        return await client.SendAsync(request);
    }

    private static async Task<string?> ReadProblemCodeAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        return document.RootElement.GetProperty("code").GetString();
    }

    private static WebApplicationFactory<Program> CreateFactory(FakeRepository repository) =>
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
                services.RemoveAll<IExamAttemptRepository>();
                services.AddSingleton<IExamAttemptRepository>(repository);
            });
        });

    private static JwtTokenService CreateTokenService() =>
        new(Options.Create(new JwtOptions
        {
            Issuer = Issuer,
            Audience = Audience,
            Secret = Secret,
            AccessTokenMinutes = 15
        }));

    private static string CreateToken(IEnumerable<Claim> claims)
    {
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Secret)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: Issuer,
            audience: Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private sealed class FakeRepository : IExamAttemptRepository
    {
        public ExamAttemptPageModel Page { get; set; } = new([], 0);
        public Guid? LastStudentId { get; private set; }
        public ExamAttemptStatus? LastStatus { get; private set; }
        public Guid? LastExamId { get; private set; }
        public ExamAttemptSortOrder LastSort { get; private set; }
        public int LastSkip { get; private set; }
        public int LastTake { get; private set; }

        public Task<bool> ExamExistsAsync(
            Guid examId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(false);

        public Task<ExamVersion?> GetPublishedVersionAsync(
            Guid examId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<ExamVersion?>(null);

        public Task<ExamAttempt?> GetActiveAsync(
            Guid studentId,
            Guid examId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<ExamAttempt?>(null);

        public Task<ExamAttempt?> GetOwnedAsync(
            Guid attemptId,
            Guid studentId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<ExamAttempt?>(null);

        public Task<ExamAttempt?> GetAsync(
            Guid attemptId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<ExamAttempt?>(null);

        public Task<IReadOnlyList<ExamAttempt>> GetExpiredAsync(
            Guid studentId,
            DateTimeOffset nowUtc,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<ExamAttempt>>([]);

        public Task<IReadOnlyList<ExamAttempt>> GetExpiredBatchAsync(
            DateTimeOffset nowUtc,
            int take,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<ExamAttempt>>([]);

        public Task<AttemptCreatePersistenceResult> AddAsync(
            ExamAttempt attempt,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(new AttemptCreatePersistenceResult(false, null));

        public Task<AttemptSavePersistenceResult> SaveAsync(
            ExamAttempt attempt,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(new AttemptSavePersistenceResult(false, null, null));

        public Task<ExamAttemptPageModel> GetPageAsync(
            Guid studentId,
            ExamAttemptStatus? status,
            Guid? examId,
            ExamAttemptSortOrder sort,
            int skip,
            int take,
            CancellationToken cancellationToken = default)
        {
            LastStudentId = studentId;
            LastStatus = status;
            LastExamId = examId;
            LastSort = sort;
            LastSkip = skip;
            LastTake = take;
            return Task.FromResult(Page);
        }
    }
}