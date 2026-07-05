using ExamForge.Application.Auth;
using ExamForge.Application.ExamClassifications;
using ExamForge.Application.ExamTags;

using Microsoft.Extensions.DependencyInjection;

namespace ExamForge.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<AuthService>();
        services.AddScoped<ExamTagService>();
        services.AddScoped<ExamCategoryService>();

        return services;
    }
}
