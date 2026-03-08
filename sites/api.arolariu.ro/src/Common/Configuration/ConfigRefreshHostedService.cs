namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;

using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

/// <summary>
/// Background service that periodically refreshes configuration and feature flags from the exp proxy.
/// </summary>
/// <remarks>
/// <para>On each cycle the service:
/// <list type="number">
///   <item><description>Waits for the build-time-seeded <see cref="ConfigCatalogResponse.RefreshIntervalSeconds"/> from the cached config snapshot.</description></item>
///   <item><description>Calls <c>GET /api/v1/run-time?for=api</c> to retrieve config values and feature flags in a single round-trip.</description></item>
///   <item><description>Swaps the <see cref="AzureOptions"/> snapshot via <see cref="IOptionsMonitorCache{TOptions}"/>.</description></item>
///   <item><description>Atomically replaces the <see cref="FeatureSnapshotCache"/> snapshot.</description></item>
/// </list>
/// </para>
/// <para>If the run-time refresh fails the error is logged and the previous snapshot is preserved.
/// The refresh interval remains sourced from the build-time payload captured during startup.</para>
/// </remarks>
/// <param name="proxyClient">The config proxy client used to fetch build-time and run-time payloads.</param>
/// <param name="catalogCache">The in-memory build-time config cache used for refresh scheduling.</param>
/// <param name="featureSnapshotCache">The in-memory feature flag snapshot cache refreshed each cycle.</param>
/// <param name="optionsMonitor">The options monitor for reading the current <see cref="AzureOptions"/> snapshot.</param>
/// <param name="optionsCache">The options cache used to atomically swap refreshed option snapshots.</param>
/// <param name="logger">The logger for recording refresh events and errors.</param>
public sealed class ConfigRefreshHostedService(
    IConfigProxyClient proxyClient,
    ConfigCatalogCache catalogCache,
    FeatureSnapshotCache featureSnapshotCache,
    IOptionsMonitor<AzureOptions> optionsMonitor,
    IOptionsMonitorCache<AzureOptions> optionsCache,
    ILogger<ConfigRefreshHostedService> logger) : BackgroundService
{
  /// <inheritdoc />
  protected override async Task ExecuteAsync(CancellationToken stoppingToken)
  {
    while (!stoppingToken.IsCancellationRequested)
    {
      // Read the server-declared refresh interval at the start of each wait so
      // the server can change cadence without restarting the API.
      var refreshInterval = TimeSpan.FromSeconds(catalogCache.CurrentCatalog.RefreshIntervalSeconds);
      await Task.Delay(refreshInterval, stoppingToken).ConfigureAwait(false);

      try
      {
        // Refresh config values + feature flags via a single run-time call.
        var bootstrap = await proxyClient.GetRunTimeAsync("api", stoppingToken).ConfigureAwait(false);
        if (bootstrap is null)
        {
          logger.LogBootstrapMissing();
          continue;
        }

        // Step 2: Swap AzureOptions snapshot.
        var refreshedOptions = CloneAzureOptions(optionsMonitor.CurrentValue);
        ApplyRefreshedValues(refreshedOptions, bootstrap.Config);
        optionsCache.TryRemove(Options.DefaultName);
        optionsCache.TryAdd(Options.DefaultName, refreshedOptions);

        // Step 3: Replace the feature snapshot.
        featureSnapshotCache.Update(bootstrap.Features, bootstrap.ContractVersion, bootstrap.FetchedAt);
        logger.LogFeatureSnapshotUpdated(bootstrap.Features.Count);

        logger.LogRefreshSucceeded();
      }
      catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
      {
        break;
      }
      catch (HttpRequestException ex)
      {
        logger.LogRefreshFailed(ex, refreshInterval);
      }
      catch (JsonException ex)
      {
        logger.LogRefreshFailed(ex, refreshInterval);
      }
      catch (InvalidOperationException ex)
      {
        logger.LogRefreshFailed(ex, refreshInterval);
      }
      catch (TaskCanceledException ex)
      {
        logger.LogRefreshFailed(ex, refreshInterval);
      }
    }
  }

  private static void ApplyRefreshedValues(
      AzureOptions options,
      IReadOnlyDictionary<string, string> values)
  {
    options.JwtSecret = values.GetValueOrDefault("Auth:JWT:Secret", options.JwtSecret);
    options.JwtIssuer = values.GetValueOrDefault("Auth:JWT:Issuer", options.JwtIssuer);
    options.JwtAudience = values.GetValueOrDefault("Auth:JWT:Audience", options.JwtAudience);
    options.TenantId = values.GetValueOrDefault("Identity:Tenant:Id", options.TenantId);
    options.OpenAIEndpoint = values.GetValueOrDefault("Endpoint:AI:OpenAI", options.OpenAIEndpoint);
    options.SqlConnectionString = values.GetValueOrDefault("Endpoint:Database:SQL", options.SqlConnectionString);
    options.NoSqlConnectionString = values.GetValueOrDefault("Endpoint:Database:NoSQL", options.NoSqlConnectionString);
    options.StorageAccountEndpoint = values.GetValueOrDefault("Endpoint:Storage:Blob", options.StorageAccountEndpoint);
    options.ApplicationInsightsEndpoint = values.GetValueOrDefault("Endpoint:Observability:Telemetry", options.ApplicationInsightsEndpoint);
    options.CognitiveServicesEndpoint = values.GetValueOrDefault("Endpoint:AI:OCR", options.CognitiveServicesEndpoint);
    options.CognitiveServicesKey = values.GetValueOrDefault("Endpoint:AI:OCR:Key", options.CognitiveServicesKey);
  }

  private static AzureOptions CloneAzureOptions(AzureOptions source)
  {
    var serialized = JsonSerializer.Serialize(source);
    return JsonSerializer.Deserialize<AzureOptions>(serialized)
      ?? throw new InvalidOperationException("Failed to clone Azure options snapshot.");
  }
}
