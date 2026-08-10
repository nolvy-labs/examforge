using ExamForge.Application;
using ExamForge.Application.Abstractions;
using ExamForge.Api.Configuration;
using ExamForge.Infrastructure;

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ExamForge.Api.Tests;

public sealed class DependencyInjectionTests
{
    [Fact]
    public void ApplicationAndInfrastructure_ResolveAllControllers()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] =
                    "Host=localhost;Database=examforge;Username=examforge;Password=examforge"
            })
            .Build();
        var services = new ServiceCollection();

        services.AddLogging();
        services.AddOptions<AuthHostingSettings>();
        services.AddScoped<ICurrentUserContext, TestCurrentUserContext>();
        services.AddApplication();
        services.AddInfrastructure(configuration);

        using var provider = services.BuildServiceProvider(new ServiceProviderOptions
        {
            ValidateOnBuild = true,
            ValidateScopes = true
        });
        using var scope = provider.CreateScope();

        var controllerTypes = typeof(Program).Assembly
            .GetTypes()
            .Where(type =>
                !type.IsAbstract &&
                typeof(ControllerBase).IsAssignableFrom(type))
            .ToList();

        Assert.NotEmpty(controllerTypes);
        Assert.All(controllerTypes, controllerType =>
            ActivatorUtilities.CreateInstance(scope.ServiceProvider, controllerType));
    }

    private sealed class TestCurrentUserContext : ICurrentUserContext
    {
        public Guid? UserId => Guid.NewGuid();
    }
}