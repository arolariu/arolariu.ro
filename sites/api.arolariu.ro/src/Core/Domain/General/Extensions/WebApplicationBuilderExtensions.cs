namespace arolariu.Backend.Core.Domain.General.Extensions;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Net.Http;
using System.Threading;

using arolariu.Backend.Common.Azure;
using arolariu.Backend.Common.Configuration;
using arolariu.Backend.Common.Http;
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
using Microsoft.Extensions.DependencyInjection.Extensions;
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
  /// <strong>Endpoint selection priority:</strong>
  /// <list type="number">
  ///   <item><description><c>EXP_PROXY_URL</c> env var → explicit override (enables bare-metal dev with Docker infra, e.g. <c>http://localhost:5002</c>).</description></item>
  ///   <item><description><c>AZURE_CLIENT_ID</c> present → <c>https://exp.arolariu.ro</c> with Entra ID bearer token.</description></item>
  ///   <item><description>Default → <c>http://exp</c> (Docker service-name DNS) with no auth.</description></item>
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

    // Endpoint selection priority:
    // 1. EXP_PROXY_URL env var (explicit override — enables bare-metal dev with Docker infra)
    // 2. AZURE_CLIENT_ID present → Azure production endpoint with Entra ID auth
    // 3. Default → Docker DNS hostname (http://exp) for containerized environments
    var explicitUrl = Environment.GetEnvironmentVariable("EXP_PROXY_URL");
    var isAzureEnv = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("AZURE_CLIENT_ID"));
    var baseUrl = !string.IsNullOrEmpty(explicitUrl)
      ? explicitUrl
      : isAzureEnv ? ConfigProxyUrlAzure : ConfigProxyUrlDocker;

    var httpClientBuilder = services.AddHttpClient<IConfigProxyClient, ConfigProxyClient>(client =>
    {
      client.BaseAddress = new Uri(baseUrl);
      client.Timeout = TimeSpan.FromSeconds(30);
      client.DefaultRequestHeaders.Add("X-Exp-Target", "api");
    });

    // Only add bearer-token auth when targeting the Azure-hosted exp service.
    // When EXP_PROXY_URL overrides to localhost, skip Entra ID auth to avoid failures.
    var useAzureAuth = baseUrl == ConfigProxyUrlAzure;
    if (useAzureAuth)
    {
      httpClientBuilder.AddHttpMessageHandler(() =>
        new BearerTokenHandler(AzureCredentialFactory.CreateCredential(), ExpScope));
    }

    // Fetch config values at startup with retry.
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
      "Endpoints:Database:SQL",
      "Endpoints:Database:NoSQL",
      "Endpoints:Storage:Blob",
      "Endpoints:Observability:Telemetry",
      "Endpoints:AI:OCR",
      "Endpoints:AI:OCR:Key",
    ];

    // Retry up to 3 times with exponential backoff in case exp is still starting.
    var configValues = new Dictionary<string, string>(configKeys.Length);
    const int maxRetries = 3;
    for (int attempt = 1; attempt <= maxRetries; attempt++)
    {
      configValues.Clear();
      foreach (var key in configKeys)
      {
        var response = proxyClient.GetConfigValueAsync(key, label: "PRODUCTION").GetAwaiter().GetResult();
        if (response is not null)
        {
          configValues[key] = response.Value;
        }
      }

      if (configValues.Count > 0) break;

      if (attempt < maxRetries)
      {
        var delay = TimeSpan.FromSeconds(Math.Pow(2, attempt));
        Console.WriteLine($"[exp] Startup config fetch attempt {attempt}/{maxRetries} returned 0 keys from {baseUrl}. Retrying in {delay.TotalSeconds}s...");
        Thread.Sleep(delay);
      }
    }

    if (configValues.Count == 0)
    {
      throw new InvalidOperationException(
            $"Unable to load any API config values from exp service at {baseUrl} after {maxRetries} attempts. " +
            $"Verify: (1) exp is running and healthy at {baseUrl}/api/health, " +
            "(2) AZURE_CLIENT_ID is set correctly for Azure deployments, " +
            "(3) the API's managed identity is in EXP_CALLER_API_IDS on the exp service.");
    }

    Console.WriteLine($"[exp] Loaded {configValues.Count}/{configKeys.Length} config keys from {baseUrl}.");

    services.AddSingleton<IOptionsManager, CloudOptionsManager>();
    services.AddSingleton(new FeatureSnapshotCache(
      new Dictionary<string, bool>(),
      string.Empty,
      DateTimeOffset.UtcNow));

    // Inject exp-fetched config into the configuration system so the auth module
    // (which builds its own temporary ServiceProvider) can resolve the signing key
    // through the options pattern without needing a shared ServiceProvider.
    builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
    {
      ["AzureOptions:JwtSecret"] = configValues.GetValueOrDefault("Auth:JWT:Secret"),
      ["AzureOptions:JwtIssuer"] = configValues.GetValueOrDefault("Auth:JWT:Issuer"),
      ["AzureOptions:JwtAudience"] = configValues.GetValueOrDefault("Auth:JWT:Audience"),
      ["AzureOptions:TenantId"] = configValues.GetValueOrDefault("Identity:Tenant:Id"),
      ["AzureOptions:SqlConnectionString"] = configValues.GetValueOrDefault("Endpoints:Database:SQL"),
      ["AzureOptions:NoSqlConnectionString"] = configValues.GetValueOrDefault("Endpoints:Database:NoSQL"),
      ["AzureOptions:StorageAccountEndpoint"] = configValues.GetValueOrDefault("Endpoints:Storage:Blob"),
      ["AzureOptions:ApplicationInsightsEndpoint"] = configValues.GetValueOrDefault("Endpoints:Observability:Telemetry"),
      ["AzureOptions:CognitiveServicesEndpoint"] = configValues.GetValueOrDefault("Endpoints:AI:OCR"),
      ["AzureOptions:CognitiveServicesKey"] = configValues.GetValueOrDefault("Endpoints:AI:OCR:Key"),
    });
    services.Configure<AzureOptions>(builder.Configuration.GetSection("AzureOptions"));

    services.AddHostedService<ConfigRefreshHostedService>();

    // Wire dependency health checks using the config values fetched at startup.
    var cosmosConnStr = configValues.GetValueOrDefault("Endpoints:Database:NoSQL", string.Empty);
    var cosmosMatch = System.Text.RegularExpressions.Regex.Match(cosmosConnStr, @"AccountEndpoint=([^;]+)");

    var healthBuilder = services.AddHealthChecks()
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
            var connStr = $"DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint={endpoint};";
            return new Azure.Storage.Blobs.BlobServiceClient(connStr, new Azure.Storage.Blobs.BlobClientOptions(Azure.Storage.Blobs.BlobClientOptions.ServiceVersion.V2025_01_05));
          }
          return new Azure.Storage.Blobs.BlobServiceClient(new Uri(endpoint), AzureCredentialFactory.CreateCredential());
        },
        configureOptions: (Action<HealthChecks.AzureStorage.AzureBlobStorageHealthCheckOptions>?)null,
        name: "blob-storage",
        failureStatus: null,
        tags: ["storage"])
      .AddUrlGroup(
        name: "exp",
        uri: new Uri($"{baseUrl}/api/health"),
        tags: ["config"]);

    if (cosmosMatch.Success)
    {
      var cosmosEndpoint = cosmosMatch.Groups[1].Value;
      if (cosmosEndpoint.Contains("documents.azure.com", StringComparison.OrdinalIgnoreCase))
      {
        // Azure Cosmos DB — use the already-registered CosmosClient singleton for health checks.
        healthBuilder.AddCheck("cosmosdb", new CosmosDbHealthCheck(cosmosEndpoint), tags: ["db", "nosql"]);
      }
      else
      {
        // Local emulator — unauthenticated URL probe is sufficient.
        healthBuilder.AddUrlGroup(
          name: "cosmosdb",
          uri: new Uri(cosmosEndpoint),
          tags: ["db", "nosql"]);
      }
    }
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
    services.AddHealthChecks();
    services.AddRateLimitingPolicies();

    services.TryAddSingleton<IExceptionToHttpResultMapper, ExceptionToHttpResultMapper>();

    builder.AddOTelLogging();
    builder.AddOTelMetering();
    builder.AddOTelTracing();
    builder.AddAuthServices();
  }
}
