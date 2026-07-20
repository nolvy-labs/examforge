using System.Net;
using System.Net.Http.Headers;
using System.Reflection;
using System.Security.Claims;
using System.Text;

using ExamForge.Api.Controllers.Admin.Exams;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Domain.Users;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.JsonPatch.SystemTextJson;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ExamForge.Api.Tests;

public sealed class AdminExamJsonPatchApiContractTests
{
    public static TheoryData<Type, Type> PatchControllers => new()
    {
        { typeof(ExamsController), typeof(ExamPatchModel) },
        { typeof(ExamVersionsController), typeof(ExamVersionPatchModel) },
        { typeof(ExamSectionsController), typeof(ExamSectionPatchModel) },
        { typeof(QuestionsController), typeof(QuestionPatchModel) },
        { typeof(QuestionOptionsController), typeof(QuestionOptionPatchModel) },
        { typeof(FillAnswerKeysController), typeof(FillAnswerKeyPatchModel) }
    };

    [Theory]
    [MemberData(nameof(PatchControllers))]
    public void Every_update_action_uses_typed_json_patch_and_patch_media_type(
        Type controllerType,
        Type patchModelType)
    {
        var method = controllerType.GetMethod("Update")!;
        var documentParameter = Assert.Single(method.GetParameters(), parameter =>
            parameter.ParameterType.IsGenericType &&
            parameter.ParameterType.GetGenericTypeDefinition() == typeof(JsonPatchDocument<>));

        Assert.Equal(patchModelType, documentParameter.ParameterType.GenericTypeArguments[0]);
        var consumes = Assert.Single(method.GetCustomAttributes<ConsumesAttribute>());
        Assert.Equal("application/json-patch+json", Assert.Single(consumes.ContentTypes));
    }

    [Fact]
    public void Exam_tag_replacement_is_an_explicit_put_action()
    {
        var method = typeof(ExamsController).GetMethod(nameof(ExamsController.ReplaceTags))!;
        var route = Assert.Single(method.GetCustomAttributes<HttpPutAttribute>());

        Assert.Equal("{id:guid}/tags", route.Template);
        Assert.Contains(method.GetParameters(), parameter => parameter.ParameterType == typeof(ReplaceExamTagsRequest));
    }

    [Fact]
    public async Task Ordinary_json_is_rejected_with_unsupported_media_type()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();
        using var content = new StringContent("[]", Encoding.UTF8, "application/json");

        var response = await client.PatchAsync($"/api/v1/admin/exams/{Guid.NewGuid()}", content);

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
    }

    [Fact]
    public async Task Malformed_json_patch_returns_bad_request()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();
        using var content = new StringContent("[{", Encoding.UTF8);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/json-patch+json");

        var response = await client.PatchAsync($"/api/v1/admin/exams/{Guid.NewGuid()}", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Swagger_generation_succeeds_with_json_patch_models()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/openapi/v1.json");

        response.EnsureSuccessStatusCode();
        var document = await response.Content.ReadAsStringAsync();
        Assert.Contains("application/json-patch+json", document, StringComparison.Ordinal);
    }

    private static WebApplicationFactory<Program> CreateFactory() =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureLogging(logging => logging.ClearProviders());
            builder.ConfigureTestServices(services =>
            {
                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthHandler.AuthenticationSchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.AuthenticationSchemeName;
                }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.AuthenticationSchemeName, _ => { });
                services.AddAuthorization(options =>
                    options.DefaultPolicy = new AuthorizationPolicyBuilder(TestAuthHandler.AuthenticationSchemeName)
                        .RequireAuthenticatedUser()
                        .Build());
            });
        });

    private sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string AuthenticationSchemeName = "Test";

        public TestAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            System.Text.Encodings.Web.UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var identity = new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
                 new Claim(ClaimTypes.Role, nameof(UserRole.Admin))],
                AuthenticationSchemeName);
            return Task.FromResult(AuthenticateResult.Success(
                new AuthenticationTicket(new ClaimsPrincipal(identity), AuthenticationSchemeName)));
        }
    }
}