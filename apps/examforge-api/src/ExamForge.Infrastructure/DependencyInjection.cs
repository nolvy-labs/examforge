using ExamForge.Application.Abstractions.Auth;
using ExamForge.Application.Abstractions.Persistence;
using ExamForge.Application.Abstractions.Users;
using ExamForge.Infrastructure.Auth;
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

        return services;
    }
}