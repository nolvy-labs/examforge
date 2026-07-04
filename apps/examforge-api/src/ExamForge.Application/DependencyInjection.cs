using ExamForge.Application.Auth;

using Microsoft.Extensions.DependencyInjection;

namespace ExamForge.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<AuthService>();

        return services;
    }
}
