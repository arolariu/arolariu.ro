namespace arolariu.Backend.Core.Domain.General.Extensions;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Net.Http;

using arolariu.Backend.Common.Azure;
using arolariu.Backend.Common.Configuration;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Common.Telemetry.Logging;
using arolariu.Backend.Common.Telemetry.Metering;
using arolariu.Backend.Common.Telemetry.Tracing;
using arolariu.Backend.Core.Auth.Modules;
using arolariu.Backend.Core.Domain.General.Configuration;
using arolariu.Backend.Core.Domain.General.Services.Swagger;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

/// <summary>
/// Provides extension methods for configuring the <see cref="WebApplicationBuilder"/> with general domain services and infrastructure.
/// This class serves as the Composition Root for dependency injection, centralizing the configuration of cross-cutting concerns
/// and foundational services required by the application.
/// </summary>
/// <remarks>
/// <para>
/// This class follows the Composition Root pattern, where all dependency injection configuration is centralized
/// in one location. It configures:
/// - Configuration sources (centralized config proxy, local files)
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
  /// <summary>Config proxy URL when running in Azure (AZURE_CLIENT_ID present → managed identity auth).</summary>
  private const string ConfigProxyUrlAzure = "https://exp.arolariu.ro";

  /// <summary>Config proxy URL when running in a local Docker environment (service name resolution via Docker DNS).</summary>
  private const string ConfigProxyUrlDocker = "http://exp";

  /// <summary>Entra ID scope for the exp service bearer-token flow.</summary>
  private const string ExpScope = "api://950ac239-5c2c-4759-bd83-911e68f6a8c9/.default";

  /// <summary>
  /// Configures the application to use local configuration sources instead of Azure services.
  /// Retained as an explicit override for special test or tooling scenarios only.
  /// </summary>
  /// <param name="builder">The <see cref="WebApplicationBuilder"/> instance to configure.</param>
  /// <remarks>
  /// <para>
  /// This method is <strong>not</strong> wired into the normal startup switch. All runtime modes
  /// (azure, proxy, local) now route through <see cref="AddProxyConfiguration"/> so that even a
  /// local Docker deployment reaches the exp service at <c>http://exp</c>. This method is preserved
  /// only for scenarios where a developer explicitly opts into file-only configuration.
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
  /// Configures the application to fetch configuration values from the exp proxy service using individual key lookups.
  /// </summary>
  /// <param name="builder">The <see cref="WebApplicationBuilder"/> instance to configure.</param>
  /// <remarks>
  /// <para>
  /// <strong>Endpoint selection</strong> is deterministic and based solely on <c>AZURE_CLIENT_ID</c>
  /// environment variable presence:
  /// <list type="bullet">
  ///   <item><description><c>AZURE_CLIENT_ID</c> present → <c>https://exp.arolariu.ro</c> with Entra ID bearer token.</description></item>
  ///   <item><description><c>AZURE_CLIENT_ID</c> absent → <c>http://exp</c> (Docker service-name DNS) with no auth.</description></item>
  /// </list>
  /// </para>
  /// <para>
  /// <strong>Startup sequence</strong> (sync-over-async is safe here — composition root, no SynchronizationContext):
  /// <list type="number">
  ///   <item><description>Fetch each of the 11 config keys individually via <c>GET /api/v1/config?name={key}</c>.</description></item>
  ///   <item><description>Seed <see cref="FeatureSnapshotCache"/> (empty — no feature flags for API currently) and <see cref="AzureOptions"/>.</description></item>
  ///   <item><description>Register <see cref="ConfigRefreshHostedService"/> to keep config values current.</description></item>
  /// </list>
  /// </para>
  /// </remarks>
  private static void AddProxyConfiguration(this WebApplicationBuilder builder)
  {
    var services = builder.Services;

    // Endpoint selection: deterministic, based solely on AZURE_CLIENT_ID presence.
    var isAzureEnv = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("AZURE_CLIENT_ID"));
    var baseUrl = isAzureEnv ? ConfigProxyUrlAzure : ConfigProxyUrlDocker;

    var httpClientBuilder = services.AddHttpClient<IConfigProxyClient, ConfigProxyClient>(client =>
    {
      client.BaseAddress = new Uri(baseUrl);
      client.Timeout = TimeSpan.FromSeconds(30);
      client.DefaultRequestHeaders.Add("X-Exp-Target", "api");
    });

    if (isAzureEnv)
    {
      httpClientBuilder.AddHttpMessageHandler(() =>
        new BearerTokenHandler(AzureCredentialFactory.CreateCredential(), ExpScope));
    }

    // Fetch config values at startup.
    // Sync-over-async at startup is safe here — no SynchronizationContext exists yet.
    // The host has not started, so there is no deadlock risk.
    using var tempProvider = services.BuildServiceProvider();
    var proxyClient = tempProvider.GetRequiredService<IConfigProxyClient>();

    // Config key names to fetch at startup (same set used by ConfigRefreshHostedService).
    string[] configKeys = [
      "Auth:JWT:Secret",
      "Auth:JWT:Issuer",
      "Auth:JWT:Audience",
      "Identity:Tenant:Id",
      "Endpoints:AI:OpenAI",
      "Endpoints:Database:SQL",
      "Endpoints:Database:NoSQL",
      "Endpoints:Storage:Blob",
      "Endpoints:Observability:Telemetry",
      "Endpoints:AI:OCR",
      "Endpoints:AI:OCR:Key",
    ];

    var configValues = new Dictionary<string, string>(configKeys.Length);
    foreach (var key in configKeys)
    {
      var response = proxyClient.GetConfigValueAsync(key).GetAwaiter().GetResult();
      if (response is not null)
      {
        configValues[key] = response.Value;
      }
    }

    if (configValues.Count == 0)
    {
      throw new InvalidOperationException(
            $"Unable to load any API config values from exp service at {baseUrl}. " +
            "Verify the exp service is reachable and AZURE_CLIENT_ID is set correctly for Azure deployments.");
    }

    services.AddSingleton<IOptionsManager, CloudOptionsManager>();
    services.AddSingleton(new FeatureSnapshotCache(
      new Dictionary<string, bool>(),
      string.Empty,
      DateTimeOffset.UtcNow));

    services.Configure<AzureOptions>(options =>
    {
      var cfg = builder.Configuration;
      options.SecretsEndpoint = cfg["ApplicationOptions:SecretsEndpoint"] ?? string.Empty;
      options.ConfigurationEndpoint = cfg["ApplicationOptions:ConfigurationEndpoint"] ?? string.Empty;
      options.JwtSecret = configValues.GetValueOrDefault("Auth:JWT:Secret", string.Empty);
      options.JwtIssuer = configValues.GetValueOrDefault("Auth:JWT:Issuer", string.Empty);
      options.JwtAudience = configValues.GetValueOrDefault("Auth:JWT:Audience", string.Empty);
      options.TenantId = configValues.GetValueOrDefault("Identity:Tenant:Id", string.Empty);
      options.OpenAIEndpoint = configValues.GetValueOrDefault("Endpoints:AI:OpenAI", string.Empty);
      options.SqlConnectionString = configValues.GetValueOrDefault("Endpoints:Database:SQL", string.Empty);
      options.NoSqlConnectionString = configValues.GetValueOrDefault("Endpoints:Database:NoSQL", string.Empty);
      options.StorageAccountEndpoint = configValues.GetValueOrDefault("Endpoints:Storage:Blob", string.Empty);
      options.ApplicationInsightsEndpoint = configValues.GetValueOrDefault("Endpoints:Observability:Telemetry", string.Empty);
      options.CognitiveServicesEndpoint = configValues.GetValueOrDefault("Endpoints:AI:OCR", string.Empty);
      options.CognitiveServicesKey = configValues.GetValueOrDefault("Endpoints:AI:OCR:Key", string.Empty);
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
  /// - Centralized config proxy (exp service) for secure configuration and feature flags
  /// </para>
  /// <para>
  /// <strong>INFRA environment variable:</strong>
  /// All three recognised values (<c>azure</c>, <c>proxy</c>, <c>local</c>) route through
  /// <see cref="AddProxyConfiguration"/>. The actual exp endpoint and authentication strategy are
  /// determined solely by <c>AZURE_CLIENT_ID</c> presence — not by the INFRA value — so local
  /// Docker environments that set <c>INFRA=local</c> transparently reach <c>http://exp</c>.
  /// Configuration values are fetched individually via the config endpoint.
  /// </para>
  /// </remarks>
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

    // All runtime modes route through the exp proxy. Endpoint selection (Azure vs Docker) is
    // determined by AZURE_CLIENT_ID presence — see AddProxyConfiguration.
    switch (infrastructure)
    {
      case "azure":
      case "proxy":
      case "local":
        AddProxyConfiguration(builder);
        break;
      default:
        throw new ArgumentException(
          "The `INFRA` env. var. must be 'azure', 'proxy', or 'local'. " +
          "All modes reach the exp proxy service; endpoint selection is based on AZURE_CLIENT_ID presence.");
    }
    #endregion

    services.AddHttpClient();
    services.AddHttpContextAccessor();
    services.AddCors(options => options.AddPolicy("AllowAllOrigins", corsBuilder => corsBuilder
          .AllowAnyOrigin()
          .AllowAnyMethod()
          .AllowAnyHeader()));

    services.AddLocalization();
    services.AddOpenApi();
    services.AddSwaggerGen(SwaggerConfigurationService.GetSwaggerGenOptions());
    services.AddHealthChecks()
      .AddSqlServer(
        name: "mssql",
        connectionStringFactory: sp => sp.GetRequiredService<IOptionsMonitor<AzureOptions>>().CurrentValue.SqlConnectionString,
        tags: ["db", "sql"])
      .AddAzureBlobStorage(
        clientFactory: sp =>
        {
          var endpoint = sp.GetRequiredService<IOptionsMonitor<AzureOptions>>().CurrentValue.StorageAccountEndpoint;
          if (endpoint.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
          {
            // Local Azurite uses HTTP — connect with the well-known dev storage connection string
            // and pin to a service version that Azurite supports.
            var connStr = $"DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint={endpoint};";
            return new Azure.Storage.Blobs.BlobServiceClient(connStr, new Azure.Storage.Blobs.BlobClientOptions(Azure.Storage.Blobs.BlobClientOptions.ServiceVersion.V2025_01_05));
          }
          return new Azure.Storage.Blobs.BlobServiceClient(new Uri(endpoint), AzureCredentialFactory.CreateCredential());
        },
        configureOptions: (Action<HealthChecks.AzureStorage.AzureBlobStorageHealthCheckOptions>?)null,
        name: "azurite-blob",
        failureStatus: null,
        tags: ["storage"])
      .AddUrlGroup(
        name: "exp",
        uri: new Uri($"{(!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("AZURE_CLIENT_ID")) ? ConfigProxyUrlAzure : ConfigProxyUrlDocker)}/api/health"),
        tags: ["config"]);
    services.AddRateLimitingPolicies();

    builder.AddOTelLogging();
    builder.AddOTelMetering();
    builder.AddOTelTracing();
    builder.AddAuthServices();
  }
}
