using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.ExamClassifications.Abstractions;
using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Student.ExamClassifications.Abstractions;
using ExamForge.Infrastructure.Auth;
using ExamForge.Infrastructure.ExamAttempts;
using ExamForge.Infrastructure.ExamClassifications.Admin;
using ExamForge.Infrastructure.ExamClassifications.Student;
using ExamForge.Infrastructure.Exams.Admin;
using ExamForge.Infrastructure.Persistence;
using ExamForge.Infrastructure.Users;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ExamForge.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");

        services.AddDbContext<ExamForgeDbContext>(options =>
        {
            options.UseNpgsql(connectionString);
        });

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IRefreshTokenService, RefreshTokenService>();
        services.AddSingleton<IRefreshTokenLifetimeProvider, RefreshTokenLifetimeProvider>();

        services.AddScoped<IAdminExamTagRepository, AdminExamTagRepository>();
        services.AddScoped<IStudentExamTagQuery, StudentExamTagQuery>();
        services.AddScoped<IAdminExamCategoryRepository, AdminExamCategoryRepository>();
        services.AddScoped<IStudentExamCategoryQuery, StudentExamCategoryQuery>();

        services.AddScoped<IAdminExamRepository, AdminExamRepository>();
        services.AddSingleton<IAdminExamSlugGenerator, AdminExamSlugGenerator>();
        services.AddScoped<IAdminExamVersionRepository, AdminExamVersionRepository>();
        services.AddScoped<IAdminExamVersionContentBatchRepository, AdminExamVersionContentBatchRepository>();
        services.AddScoped<IAdminExamVersionContentCloner, AdminExamVersionContentCloner>();
        services.AddScoped<IAdminExamVersionPublishReadinessChecker, AdminExamVersionPublishReadinessChecker>();
        services.AddScoped<IAdminExamSectionRepository, AdminExamSectionRepository>();
        services.AddScoped<IAdminQuestionRepository, AdminQuestionRepository>();
        services.AddScoped<IAdminQuestionOptionRepository, AdminQuestionOptionRepository>();
        services.AddScoped<IAdminFillAnswerKeyRepository, AdminFillAnswerKeyRepository>();

        services.AddScoped<IExamAttemptRepository, ExamAttemptRepository>();
        services.AddScoped<IExamAttemptAnswerRepository, ExamAttemptAnswerRepository>();
        services.AddScoped<IExamAttemptSelectedOptionRepository, ExamAttemptSelectedOptionRepository>();

        return services;
    }
}