using ExamForge.Application.Admin.ExamClassifications.Services;
using ExamForge.Application.Admin.Exams.Services;
using ExamForge.Application.Admin.Exams.Utils;
using ExamForge.Application.Auth;
using ExamForge.Application.Student.ExamAttempts.Scoring;
using ExamForge.Application.Student.ExamAttempts.Services;
using ExamForge.Application.Student.ExamClassifications.Services;
using ExamForge.Application.Student.Exams.Services;

using Microsoft.Extensions.DependencyInjection;

namespace ExamForge.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<AuthService>();
        services.AddScoped<AdminExamTagService>();
        services.AddScoped<AdminExamCategoryService>();
        services.AddScoped<StudentExamDiscoveryService>();
        services.AddScoped<StudentExamService>();

        services.AddScoped<AdminExamService>();
        services.AddScoped<AdminExamVersionService>();
        services.AddScoped<AdminExamVersionContentBatchService>();
        services.AddScoped<AdminExamSectionService>();
        services.AddScoped<AdminQuestionService>();
        services.AddScoped<AdminQuestionOptionService>();
        services.AddScoped<AdminFillAnswerKeyService>();
        services.AddScoped<NestedExamContentFactory>();
        services.AddScoped<NestedExamContentPersistence>();

        services.AddScoped<ExamAttemptService>();
        services.AddScoped<ExamAttemptScoringService>();
        services.AddScoped<ExamAttemptExpirationFinalizer>();
        services.AddScoped<ExamAttemptExpirationBatchProcessor>();

        return services;
    }
}