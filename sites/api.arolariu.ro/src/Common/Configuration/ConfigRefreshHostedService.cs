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

/// <summary>Background service that refreshes config from the proxy every 5 minutes.</summary>
/// <param name="proxyClient">The config proxy client used to fetch catalogs and key values.</param>
/// <param name="catalogCache">The in-memory catalog cache for required key definitions.</param>
/// <param name="optionsMonitor">The options monitor for accessing current Azure options.</param>
/// <param name="optionsCache">The options cache used to atomically swap refreshed option snapshots.</param>
/// <param name="logger">The logger for recording refresh events and errors.</param>
public sealed class ConfigRefreshHostedService(
    IConfigProxyClient proxyClient,
    ConfigCatalogCache catalogCache,
    IOptionsMonitor<AzureOptions> optionsMonitor,
    IOptionsMonitorCache<AzureOptions> optionsCache,
    ILogger<ConfigRefreshHostedService> logger) : BackgroundService
{
  private static readonly TimeSpan RefreshInterval = TimeSpan.FromMinutes(5);

  /// <inheritdoc />
  protected override async Task ExecuteAsync(CancellationToken stoppingToken)
  {
    while (!stoppingToken.IsCancellationRequested)
    {
      await Task.Delay(RefreshInterval, stoppingToken).ConfigureAwait(false);

      try
      {
        var latestCatalog = await proxyClient.GetCatalogAsync("api", stoppingToken).ConfigureAwait(false);
        if (latestCatalog is null)
        {
          logger.LogCatalogMissing(catalogCache.CurrentCatalog.Version);
        }
        else if (latestCatalog.RequiredKeys.Count == 0)
        {
          logger.LogEmptyCatalogReceived(catalogCache.CurrentCatalog.Version);
        }
        else
        {
          catalogCache.Update(latestCatalog);
        }

        var configKeys = catalogCache.RequiredKeys;
        if (configKeys.Count == 0)
        {
          logger.LogNoRequiredKeys();
          continue;
        }

        var values = await proxyClient.GetValuesAsync(configKeys, stoppingToken).ConfigureAwait(false);

        var refreshedOptions = CloneAzureOptions(optionsMonitor.CurrentValue);
        ApplyRefreshedValues(refreshedOptions, values);

        optionsCache.TryRemove(Options.DefaultName);
        optionsCache.TryAdd(Options.DefaultName, refreshedOptions);

        logger.LogRefreshSucceeded();
      }
      catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
      {
        break;
      }
      catch (HttpRequestException ex)
      {
        logger.LogRefreshFailed(ex, RefreshInterval);
      }
      catch (JsonException ex)
      {
        logger.LogRefreshFailed(ex, RefreshInterval);
      }
      catch (InvalidOperationException ex)
      {
        logger.LogRefreshFailed(ex, RefreshInterval);
      }
      catch (TaskCanceledException ex)
      {
        logger.LogRefreshFailed(ex, RefreshInterval);
      }
    }
  }

  private static void ApplyRefreshedValues(AzureOptions options, IReadOnlyDictionary<string, string> values)
  {
    options.JwtSecret = values.GetValueOrDefault("Common:Auth:Secret", options.JwtSecret);
    options.JwtIssuer = values.GetValueOrDefault("Common:Auth:Issuer", options.JwtIssuer);
    options.JwtAudience = values.GetValueOrDefault("Common:Auth:Audience", options.JwtAudience);
    options.TenantId = values.GetValueOrDefault("Common:Azure:TenantId", options.TenantId);
    options.OpenAIEndpoint = values.GetValueOrDefault("Endpoints:OpenAI", options.OpenAIEndpoint);
    options.SqlConnectionString = values.GetValueOrDefault("Endpoints:SqlServer", options.SqlConnectionString);
    options.NoSqlConnectionString = values.GetValueOrDefault("Endpoints:NoSqlServer", options.NoSqlConnectionString);
    options.StorageAccountEndpoint = values.GetValueOrDefault("Endpoints:StorageAccount", options.StorageAccountEndpoint);
    options.ApplicationInsightsEndpoint = values.GetValueOrDefault("Endpoints:ApplicationInsights", options.ApplicationInsightsEndpoint);
    options.CognitiveServicesEndpoint = values.GetValueOrDefault("Endpoints:CognitiveServices", options.CognitiveServicesEndpoint);
    options.CognitiveServicesKey = values.GetValueOrDefault("Endpoints:CognitiveServices:Key", options.CognitiveServicesKey);
  }

  private static AzureOptions CloneAzureOptions(AzureOptions source)
  {
    var serialized = JsonSerializer.Serialize(source);
    return JsonSerializer.Deserialize<AzureOptions>(serialized)
      ?? throw new InvalidOperationException("Failed to clone Azure options snapshot.");
  }
}
