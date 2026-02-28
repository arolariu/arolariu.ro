namespace arolariu.Backend.Core.Domain.General.Extensions;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Azure;
using arolariu.Backend.Common.Configuration;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Common.Services.KeyVault;
using arolariu.Backend.Common.Telemetry.Logging;
using arolariu.Backend.Common.Telemetry.Metering;
using arolariu.Backend.Common.Telemetry.Tracing;
using arolariu.Backend.Core.Auth.Modules;
using arolariu.Backend.Core.Domain.General.Configuration;
using arolariu.Backend.Core.Domain.General.Services.Swagger;

using Azure.Core;
using Azure.Extensions.AspNetCore.Configuration.Secrets;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Provides extension methods for configuring the <see cref="WebApplicationBuilder"/> with general domain services and infrastructure.
/// This class serves as the Composition Root for dependency injection, centralizing the configuration of cross-cutting concerns
/// and foundational services required by the application.
/// </summary>
/// <remarks>
/// <para>
/// This class follows the Composition Root pattern, where all dependency injection configuration is centralized
/// in one location. It configures:
/// - Configuration sources (Azure Key Vault, App Configuration, local files)
/// - Cross-cutting concerns (CORS, localization, HTTP clients)
/// - Infrastructure services (health checks, telemetry, authentication)
/// - Third-party integrations (Swagger documentation, Azure services)
/// </para>
/// <para>
/// The configuration is environment-aware, automatically adjusting between development and production settings
/// based on the ASPNETCORE_ENVIRONMENT variable.
/// </para>
/// </remarks>
[ExcludeFromCodeCoverage] // Infrastructure code is not tested as it primarily consists of configuration logic.
internal static class WebApplicationBuilderExtensions
{
  /// <summary>Config proxy URL — hardcoded, production.</summary>
  private const string ConfigProxyUrlAzure = "https://experiments.arolariu.ro";
  /// <summary>Config proxy URL — hardcoded, local dev.</summary>
  private const string ConfigProxyUrlLocal = "http://localhost:5002";
  /// <summary>Entra ID scope for experiments service.</summary>
  private const string ExperimentsScope = "api://experiments-arolariu-ro/.default";

  /// <summary>
  /// Configures the application to use Azure Key Vault for secrets management and Azure App Configuration for centralized configuration.
  /// This method establishes secure connections to Azure services and sets up configuration providers with appropriate retry policies.
  /// </summary>
  /// <param name="builder">The <see cref="WebApplicationBuilder"/> instance to configure with Azure services.</param>
  /// <remarks>
  /// <para>
  /// This method configures two primary Azure services:
  /// - Azure Key Vault: For secure storage and retrieval of application secrets
  /// - Azure App Configuration: For centralized application configuration management
  /// </para>
  /// <para>
  /// Authentication is handled using AzureCredentialFactory, which supports multiple authentication methods:
  /// - Managed Identity (in production environments)
  /// - Azure CLI credentials (in development)
  /// - Environment variables and other fallback methods
  /// </para>
  /// <para>
  /// Configuration behavior varies by environment:
  /// - DEBUG builds: Uses "DEVELOPMENT" label filter for App Configuration
  /// - RELEASE builds: Uses "PRODUCTION" label filter and explicit Managed Identity client ID
  /// </para>
  /// <para>
  /// Retry policies are configured with exponential backoff:
  /// - Maximum 10 retries with 30-second base delay
  /// - 5-minute network timeout for resilience against transient failures
  /// </para>
  /// <para>
  /// Both services are configured with 30-minute refresh intervals to balance between
  /// configuration freshness and service load.
  /// </para>
  /// </remarks>
  /// <exception cref="ArgumentNullException">
  /// Thrown when required configuration keys (SecretsEndpoint, ConfigurationEndpoint) are missing.
  /// </exception>
  /// <exception cref="UriFormatException">
  /// Thrown when the provided endpoint URLs are not valid URIs.
  /// </exception>
  private static void AddAzureConfiguration(this WebApplicationBuilder builder)
  {
    var services = builder.Services;
    var configuration = builder.Configuration;

    var credentials = AzureCredentialFactory.CreateCredential();

    var secretsStoreEndpoint = new Uri(configuration["ApplicationOptions:SecretsEndpoint"]!);
    var configStoreEndpoint = new Uri(configuration["ApplicationOptions:ConfigurationEndpoint"]!);

    var keyVaultConfigurationProvider = new ConfigurationBuilder()
      .AddAzureKeyVault(
        vaultUri: secretsStoreEndpoint,
        credential: credentials,
        options: new AzureKeyVaultConfigurationOptions() { ReloadInterval = TimeSpan.FromMinutes(30) })
      .Build();

    var configStoreConfigurationProvider = new ConfigurationBuilder()
      .AddAzureAppConfiguration(config =>
      {
        config.ConfigureKeyVault(kv =>
        {
          kv.SetCredential(credentials);
          kv.SetSecretRefreshInterval(TimeSpan.FromMinutes(30));
        });

        config.ConfigureClientOptions(options =>
        {
          options.Retry.MaxRetries = 10;
          options.Retry.Mode = RetryMode.Exponential;
          options.Retry.Delay = TimeSpan.FromSeconds(30);
          options.Retry.NetworkTimeout = TimeSpan.FromSeconds(300);
        });

#if DEBUG
        config.Select("*", labelFilter: "DEVELOPMENT");
#else
                config.Select("*", labelFilter: "PRODUCTION");
#endif

        config.Connect(configStoreEndpoint, credentials);
      })
      .Build();

    services.AddSingleton<IOptionsManager, CloudOptionsManager>();
    services.AddSingleton<IKeyVaultService, KeyVaultService>();

    services.Configure<AzureOptions>(options =>
    {
      options.SecretsEndpoint = secretsStoreEndpoint.ToString();
      options.ConfigurationEndpoint = configStoreEndpoint.ToString();
      options.JwtSecret = configStoreConfigurationProvider["Common:Auth:Secret"] ?? string.Empty;
      options.JwtIssuer = configStoreConfigurationProvider["Common:Auth:Issuer"] ?? string.Empty;
      options.JwtAudience = configStoreConfigurationProvider["Common:Auth:Audience"] ?? string.Empty;
      options.TenantId = configStoreConfigurationProvider["Common:Azure:TenantId"] ?? string.Empty;
      options.OpenAIEndpoint = configStoreConfigurationProvider["Endpoints:OpenAI"] ?? string.Empty;
      options.SqlConnectionString = configStoreConfigurationProvider["Endpoints:SqlServer"] ?? string.Empty;
      options.NoSqlConnectionString = configStoreConfigurationProvider["Endpoints:NoSqlServer"] ?? string.Empty;
      options.StorageAccountEndpoint = configStoreConfigurationProvider["Endpoints:StorageAccount"] ?? string.Empty;
      options.ApplicationInsightsEndpoint = configStoreConfigurationProvider["Endpoints:ApplicationInsights"] ?? string.Empty;
      options.CognitiveServicesEndpoint = configStoreConfigurationProvider["Endpoints:CognitiveServices"] ?? string.Empty;
      options.CognitiveServicesKey = configStoreConfigurationProvider["Endpoints:CognitiveServices:Key"] ?? string.Empty;
    });
  }

  /// <summary>
  /// Configures the application to use local configuration sources instead of Azure services.
  /// This method is intended for local development scenarios where Azure services are not available or desired.
  /// </summary>
  /// <param name="builder">The <see cref="WebApplicationBuilder"/> instance to configure with local configuration sources.</param>
  /// <remarks>
  /// <para>
  /// This method sets up local configuration management using:
  /// - LocalOptionsManager: Manages configuration from local files and environment variables
  /// - LocalOptions: Configuration section binding for local development settings
  /// </para>
  /// <para>
  /// This configuration approach is typically used during:
  /// - Local development and testing
  /// - CI/CD pipeline builds where Azure connectivity is not required
  /// - Offline development scenarios
  /// </para>
  /// <para>
  /// Note: This method is currently marked as unused but reserved for future implementation
  /// of environment-specific configuration logic.
  /// </para>
  /// </remarks>
  private static void AddLocalConfiguration(this WebApplicationBuilder builder)
  {
    var services = builder.Services;
    var configuration = builder.Configuration;

    services.AddSingleton<IOptionsManager, LocalOptionsManager>();
    services.Configure<LocalOptions>(configuration.GetSection(nameof(LocalOptions)));
  }

  /// <summary>
  /// Configures the application to fetch configuration from experiments.arolariu.ro.
  /// </summary>
  /// <param name="builder">The <see cref="WebApplicationBuilder"/> instance to configure with proxy configuration.</param>
  /// <remarks>
  /// <para>
  /// This method sets up a config proxy client that fetches configuration values from
  /// the experiments.arolariu.ro service, which acts as a centralized configuration proxy
  /// for Azure App Configuration and Key Vault.
  /// </para>
  /// <para>
  /// The proxy URL is selected based on the ASPNETCORE_ENVIRONMENT variable:
  /// - Production: https://experiments.arolariu.ro
  /// - Other environments: http://localhost:5002
  /// </para>
  /// <para>
  /// A background hosted service (<see cref="ConfigRefreshHostedService"/>) is registered
  /// to periodically refresh configuration values every 5 minutes.
  /// </para>
  /// </remarks>
  private static void AddProxyConfiguration(this WebApplicationBuilder builder)
  {
    var services = builder.Services;
    var isAzureEnv = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production";
    var baseUrl = isAzureEnv ? ConfigProxyUrlAzure : ConfigProxyUrlLocal;

    services.AddHttpClient<IConfigProxyClient, ConfigProxyClient>(client =>
    {
      client.BaseAddress = new Uri(baseUrl);
      client.Timeout = TimeSpan.FromSeconds(30);
    });

    // Fetch config at startup
    using var tempProvider = services.BuildServiceProvider();
    var proxyClient = tempProvider.GetRequiredService<IConfigProxyClient>();
    var configValues = proxyClient.GetValuesAsync(new[]
    {
      "Common:Auth:Secret", "Common:Auth:Issuer", "Common:Auth:Audience",
      "Common:Azure:TenantId", "Endpoints:OpenAI", "Endpoints:SqlServer",
      "Endpoints:NoSqlServer", "Endpoints:StorageAccount",
      "Endpoints:ApplicationInsights", "Endpoints:CognitiveServices",
      "Endpoints:CognitiveServices:Key"
    }).GetAwaiter().GetResult();

    services.AddSingleton<IOptionsManager, CloudOptionsManager>();
    services.Configure<AzureOptions>(options =>
    {
      var cfg = builder.Configuration;
      options.SecretsEndpoint = cfg["ApplicationOptions:SecretsEndpoint"] ?? string.Empty;
      options.ConfigurationEndpoint = cfg["ApplicationOptions:ConfigurationEndpoint"] ?? string.Empty;
      options.JwtSecret = configValues.GetValueOrDefault("Common:Auth:Secret", string.Empty);
      options.JwtIssuer = configValues.GetValueOrDefault("Common:Auth:Issuer", string.Empty);
      options.JwtAudience = configValues.GetValueOrDefault("Common:Auth:Audience", string.Empty);
      options.TenantId = configValues.GetValueOrDefault("Common:Azure:TenantId", string.Empty);
      options.OpenAIEndpoint = configValues.GetValueOrDefault("Endpoints:OpenAI", string.Empty);
      options.SqlConnectionString = configValues.GetValueOrDefault("Endpoints:SqlServer", string.Empty);
      options.NoSqlConnectionString = configValues.GetValueOrDefault("Endpoints:NoSqlServer", string.Empty);
      options.StorageAccountEndpoint = configValues.GetValueOrDefault("Endpoints:StorageAccount", string.Empty);
      options.ApplicationInsightsEndpoint = configValues.GetValueOrDefault("Endpoints:ApplicationInsights", string.Empty);
      options.CognitiveServicesEndpoint = configValues.GetValueOrDefault("Endpoints:CognitiveServices", string.Empty);
      options.CognitiveServicesKey = configValues.GetValueOrDefault("Endpoints:CognitiveServices:Key", string.Empty);
    });

    services.AddHostedService<ConfigRefreshHostedService>();
  }

  /// <summary>
  /// Configures the <see cref="WebApplicationBuilder"/> with general domain services and cross-cutting infrastructure concerns.
  /// This method serves as the primary composition root for the application's foundational services.
  /// </summary>
  /// <param name="builder">The <see cref="WebApplicationBuilder"/> instance to configure with general domain services.</param>
  /// <remarks>
  /// <para>
  /// This method configures the following service categories in order:
  /// </para>
  /// <para>
  /// <strong>Configuration Sources:</strong>
  /// - Environment variables for runtime configuration overrides
  /// - appsettings.json for base application settings
  /// - Environment-specific appsettings files (Development/Production)
  /// - Azure Key Vault and App Configuration for secure and centralized configuration
  /// </para>
  /// <para>
  /// <strong>HTTP and Communication Services:</strong>
  /// - HttpClient for outbound HTTP communications
  /// - HttpContextAccessor for accessing HTTP context in non-controller classes
  /// - CORS policy "AllowAllOrigins" for cross-origin requests (development-focused)
  /// </para>
  /// <para>
  /// <strong>API Documentation and Discovery:</strong>
  /// - API Explorer endpoints for service discovery
  /// - Swagger/OpenAPI documentation generation with custom configuration
  /// </para>
  /// <para>
  /// <strong>Localization and Internationalization:</strong>
  /// - Localization services for multi-language support
  /// </para>
  /// <para>
  /// <strong>Monitoring and Health:</strong>
  /// - Health checks for service availability monitoring
  /// - OpenTelemetry integration for distributed tracing, logging, and metrics
  /// </para>
  /// <para>
  /// <strong>Authentication and Authorization:</strong>
  /// - Authentication services through Auth module integration
  /// </para>
  /// </remarks>
  /// <example>
  /// <code>
  /// // Usage in Program.cs
  /// WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
  /// builder.AddGeneralDomainConfiguration();
  ///
  /// WebApplication app = builder.Build();
  /// // Configure application pipeline...
  /// app.Run();
  /// </code>
  /// </example>
  /// <seealso cref="WebApplicationBuilder"/>
  /// <seealso cref="WebApplicationExtensions.AddGeneralApplicationConfiguration"/>
  public static void AddGeneralDomainConfiguration(this WebApplicationBuilder builder)
  {
    var services = builder.Services;
    var configuration = builder.Configuration;
    var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
    Console.WriteLine($">>> [arolariu.ro::build] Environment variable: {environment}");

    #region Setting up the service configuration.
    configuration.AddEnvironmentVariables();
    configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
    configuration.AddJsonFile($"appsettings.{environment}.json", optional: false, reloadOnChange: true);

    var infrastructure = Environment.GetEnvironmentVariable("INFRA");
    Console.WriteLine($">>> [arolariu.ro::build] Infrastructure variable: {infrastructure}");

    switch (infrastructure)
    {
      case "azure":
        AddAzureConfiguration(builder);
        break;
      case "proxy":
        AddProxyConfiguration(builder);
        break;
      case "local":
        AddLocalConfiguration(builder);
        break;
      default:
        throw new ArgumentException("The `INFRA` env. var. must be 'azure', 'proxy', or 'local'.");
    }
    #endregion

    services.AddHttpClient();
    services.AddHttpContextAccessor();
    services.AddCors(options => options.AddPolicy("AllowAllOrigins", builder => builder
          .AllowAnyOrigin()
          .AllowAnyMethod()
          .AllowAnyHeader()));

    services.AddLocalization();
    services.AddOpenApi();
    services.AddSwaggerGen(SwaggerConfigurationService.GetSwaggerGenOptions());
    services.AddHealthChecks();
    services.AddRateLimitingPolicies();

    builder.AddOTelLogging();
    builder.AddOTelMetering();
    builder.AddOTelTracing();
    builder.AddAuthServices();
  }
}
