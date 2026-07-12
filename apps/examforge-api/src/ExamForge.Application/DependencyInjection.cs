using ExamForge.Application.Auth;
using ExamForge.Application.ExamAttempts;
using ExamForge.Application.ExamClassifications;
using ExamForge.Application.Exams;
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

        services.AddScoped<ExamService>();
        services.AddScoped<ExamVersionService>();
        services.AddScoped<ExamSectionService>();
        services.AddScoped<QuestionService>();
        services.AddScoped<QuestionOptionService>();
        services.AddScoped<FillAnswerKeyService>();

        services.AddScoped<ExamAttemptService>();
        services.AddScoped<ExamAttemptAnswerService>();
        services.AddScoped<ExamAttemptSelectedOptionService>();

        return services;
    }
}
