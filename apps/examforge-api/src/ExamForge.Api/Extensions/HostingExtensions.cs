using System.Net;

using ExamForge.Api.Configuration;
using ExamForge.Api.Middleware;

using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;

namespace ExamForge.Api.Extensions;

public static class HostingExtensions
{
    public const string FrontendCorsPolicy = "Frontend";

    public static IServiceCollection AddApiHosting(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var isProduction = environment.IsProduction();

        services
            .AddOptions<HostingSettings>()
            .Configure(options => options.AllowedHosts = configuration["AllowedHosts"] ?? string.Empty)
            .Validate(
                options => !isProduction ||
                    ProductionConfigurationValidation.HasValidProductionHost(options.AllowedHosts),
                $"Production AllowedHosts must be exactly '{HostingSettings.ProductionHost}'.")
            .ValidateOnStart();

        services
            .AddOptions<CorsSettings>()
            .Bind(configuration.GetSection(CorsSettings.SectionName))
            .Validate(
                options => !isProduction ||
                    ProductionConfigurationValidation.HasValidProductionCorsOrigins(options),
                "Production CORS origins must contain at least one exact HTTPS origin without wildcards, paths, queries, or fragments.")
            .ValidateOnStart();

        services
            .AddOptions<ForwardedHeadersSettings>()
            .Bind(configuration.GetSection(ForwardedHeadersSettings.SectionName))
            .Validate(
                options => ProductionConfigurationValidation.HasValidForwardedHeaders(
                    options,
                    requireTrustedSource: isProduction),
                "ForwardedHeaders must use ForwardLimit 1, valid proxy IPs/CIDRs, and at least one trusted source in Production.")
            .ValidateOnStart();

        services
            .AddOptions<AuthHostingSettings>()
            .Bind(configuration.GetSection(AuthHostingSettings.SectionName))
            .ValidateOnStart();

        services
            .AddOptions<ForwardedHeadersOptions>()
            .Configure<IOptions<ForwardedHeadersSettings>>((options, settingsAccessor) =>
            {
                var settings = settingsAccessor.Value;
                options.ForwardedHeaders =
                    ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                options.ForwardLimit = settings.ForwardLimit;
                options.KnownProxies.Clear();
                options.KnownIPNetworks.Clear();

                foreach (var proxy in settings.KnownProxies)
                {
                    options.KnownProxies.Add(IPAddress.Parse(proxy));
                }

                foreach (var network in settings.KnownNetworks)
                {
                    options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(network));
                }
            });

        services.AddHttpsRedirection(options => options.HttpsPort = 443);

        var corsSettings = configuration
            .GetSection(CorsSettings.SectionName)
            .Get<CorsSettings>() ?? new CorsSettings();
        services.AddCors(options => options.AddPolicy(FrontendCorsPolicy, policy =>
            policy
                .WithOrigins(corsSettings.AllowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .WithExposedHeaders("ETag", CorrelationIdContext.HeaderName)
                .AllowCredentials()));

        return services;
    }
}
