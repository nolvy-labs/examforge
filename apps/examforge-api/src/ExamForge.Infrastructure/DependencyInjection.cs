using ExamForge.Application.Abstractions;
using ExamForge.Infrastructure.Auth;
using ExamForge.Infrastructure.ExamAttempts;
using ExamForge.Infrastructure.ExamClassifications;
using ExamForge.Infrastructure.Exams;
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

        services.AddScoped<IExamTagRepository, ExamTagRepository>();
        services.AddScoped<IExamCategoryRepository, ExamCategoryRepository>();

        services.AddScoped<IExamRepository, ExamRepository>();
        services.AddSingleton<IExamSlugGenerator, ExamSlugGenerator>();
        services.AddScoped<IExamVersionRepository, ExamVersionRepository>();
        services.AddScoped<IExamVersionContentCloner, ExamVersionContentCloner>();
        services.AddScoped<IExamVersionPublishReadinessChecker, ExamVersionPublishReadinessChecker>();
        services.AddScoped<IExamSectionRepository, ExamSectionRepository>();
        services.AddScoped<IQuestionRepository, QuestionRepository>();
        services.AddScoped<IQuestionOptionRepository, QuestionOptionRepository>();
        services.AddScoped<IFillAnswerKeyRepository, FillAnswerKeyRepository>();

        services.AddScoped<IExamAttemptRepository, ExamAttemptRepository>();
        services.AddScoped<IExamAttemptAnswerRepository, ExamAttemptAnswerRepository>();
        services.AddScoped<IExamAttemptSelectedOptionRepository, ExamAttemptSelectedOptionRepository>();

        return services;
    }
}