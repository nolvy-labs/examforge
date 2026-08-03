using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;

using ExamForge.Api.Common.Constants;
using ExamForge.Application.Abstractions;
using ExamForge.Application.Auth;
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

public sealed class AuthMeApiTests
{
    private const string Issuer = "ExamForge.Tests";
    private const string Audience = "ExamForge.Tests.Client";
    private const string Secret = "examforge-tests-only-secret-that-is-at-least-64-characters-long-123456789";

    [Fact]
    public async Task Me_ReturnsProfileFromValidatedAccessToken_WithoutCallingUserRepository()
    {
        var user = new User(
            "student@example.com",
            "password-hash",
            "Student Name",
            UserRole.Student);
        var repository = new TrackingUserRepository();
        await using var factory = CreateFactory(repository);
        using var client = CreateClient(factory);
        var token = CreateTokenService().CreateAccessToken(user).Token;

        using var response = await GetMeAsync(client, token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<UserProfileResponse>();
        Assert.Equal(new UserProfileResponse(user.Id, user.Email, user.DisplayName, user.Role), profile);
        Assert.Equal(0, repository.CallCount);
    }

    [Fact]
    public async Task Me_WithoutDisplayName_ReturnsProfileSuccessfully()
    {
        var user = new User(
            "student@example.com",
            "password-hash",
            null,
            UserRole.Student);
        await using var factory = CreateFactory(new TrackingUserRepository());
        using var client = CreateClient(factory);
        var token = CreateTokenService().CreateAccessToken(user).Token;

        using var response = await GetMeAsync(client, token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<UserProfileResponse>();
        Assert.NotNull(profile);
        Assert.Null(profile.DisplayName);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not-a-guid")]
    public async Task Me_WithMissingOrMalformedUserId_ReturnsUnauthorized(string? userId)
    {
        var claims = RequiredClaims(includeUserId: false);
        if (userId is not null)
        {
            claims.Add(new Claim(JwtRegisteredClaimNames.Sub, userId));
        }

        await AssertUnauthorizedAsync(claims);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("Unknown")]
    public async Task Me_WithMissingOrInvalidRole_ReturnsUnauthorized(string? role)
    {
        var claims = RequiredClaims(includeRole: false);
        if (role is not null)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        await AssertUnauthorizedAsync(claims);
    }

    [Fact]
    public async Task Me_WithMissingEmail_ReturnsUnauthorized()
    {
        await AssertUnauthorizedAsync(RequiredClaims(includeEmail: false));
    }

    private static async Task AssertUnauthorizedAsync(IReadOnlyCollection<Claim> claims)
    {
        await using var factory = CreateFactory(new TrackingUserRepository());
        using var client = CreateClient(factory);

        using var response = await GetMeAsync(client, CreateToken(claims));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static List<Claim> RequiredClaims(
        bool includeUserId = true,
        bool includeEmail = true,
        bool includeRole = true)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (includeUserId)
        {
            claims.Add(new Claim(JwtRegisteredClaimNames.Sub, Guid.NewGuid().ToString()));
        }

        if (includeEmail)
        {
            claims.Add(new Claim(JwtRegisteredClaimNames.Email, "student@example.com"));
        }

        if (includeRole)
        {
            claims.Add(new Claim(ClaimTypes.Role, nameof(UserRole.Student)));
        }

        return claims;
    }

    private static HttpClient CreateClient(WebApplicationFactory<Program> factory)
    {
        return factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = false
        });
    }

    private static async Task<HttpResponseMessage> GetMeAsync(HttpClient client, string token)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me");
        request.Headers.Add("Cookie", $"{AuthCookieNames.AccessToken}={token}");
        return await client.SendAsync(request);
    }

    private static WebApplicationFactory<Program> CreateFactory(TrackingUserRepository repository)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
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
                services.RemoveAll<IUserRepository>();
                services.AddSingleton<IUserRepository>(repository);
            });
        });
    }

    private static JwtTokenService CreateTokenService()
    {
        return new JwtTokenService(Options.Create(new JwtOptions
        {
            Issuer = Issuer,
            Audience = Audience,
            Secret = Secret,
            AccessTokenMinutes = 15
        }));
    }

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

    private sealed class TrackingUserRepository : IUserRepository
    {
        public int CallCount { get; private set; }

        public Task<User?> GetByNormalizedEmailAsync(
            string normalizedEmail,
            CancellationToken cancellationToken = default)
        {
            CallCount++;
            throw new InvalidOperationException("The user repository must not be called by /auth/me.");
        }

        public Task<bool> ExistsByNormalizedEmailAsync(
            string normalizedEmail,
            CancellationToken cancellationToken = default)
        {
            CallCount++;
            throw new InvalidOperationException("The user repository must not be called by /auth/me.");
        }

        public void Add(User user)
        {
            CallCount++;
            throw new InvalidOperationException("The user repository must not be called by /auth/me.");
        }
    }
}