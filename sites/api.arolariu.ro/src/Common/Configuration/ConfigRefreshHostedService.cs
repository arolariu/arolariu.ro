namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
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
/// <param name="logger">The logger for recording refresh events and errors.</param>
public sealed class ConfigRefreshHostedService(
    IConfigProxyClient proxyClient,
    ConfigCatalogCache catalogCache,
    IOptionsMonitor<AzureOptions> optionsMonitor,
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
          logger.LogWarning(
            "Catalog refresh returned no catalog. Continuing with cached catalog version {CatalogVersion}.",
            catalogCache.CurrentCatalog.Version);
        }
        else if (latestCatalog.RequiredKeys.Count == 0)
        {
          logger.LogWarning(
            "Catalog refresh returned an empty required key set. Continuing with cached catalog version {CatalogVersion}.",
            catalogCache.CurrentCatalog.Version);
        }
        else
        {
          catalogCache.Update(latestCatalog);
        }

        var configKeys = catalogCache.RequiredKeys;
        if (configKeys.Count == 0)
        {
          logger.LogWarning("Catalog contains no required keys. Skipping refresh cycle.");
          continue;
        }

        var values = await proxyClient.GetValuesAsync(configKeys, stoppingToken).ConfigureAwait(false);

        // Note: Directly mutating CurrentValue works because AzureOptions properties are mutable
        // and CloudOptionsManager returns CurrentValue by reference. For truly reactive options,
        // consider implementing IOptionsChangeTokenSource<AzureOptions> in a future iteration.
        var opts = optionsMonitor.CurrentValue;
        opts.JwtSecret = values.GetValueOrDefault("Common:Auth:Secret", opts.JwtSecret);
        opts.JwtIssuer = values.GetValueOrDefault("Common:Auth:Issuer", opts.JwtIssuer);
        opts.JwtAudience = values.GetValueOrDefault("Common:Auth:Audience", opts.JwtAudience);
        opts.TenantId = values.GetValueOrDefault("Common:Azure:TenantId", opts.TenantId);
        opts.OpenAIEndpoint = values.GetValueOrDefault("Endpoints:OpenAI", opts.OpenAIEndpoint);
        opts.SqlConnectionString = values.GetValueOrDefault("Endpoints:SqlServer", opts.SqlConnectionString);
        opts.NoSqlConnectionString = values.GetValueOrDefault("Endpoints:NoSqlServer", opts.NoSqlConnectionString);
        opts.StorageAccountEndpoint = values.GetValueOrDefault("Endpoints:StorageAccount", opts.StorageAccountEndpoint);
        opts.ApplicationInsightsEndpoint = values.GetValueOrDefault("Endpoints:ApplicationInsights", opts.ApplicationInsightsEndpoint);
        opts.CognitiveServicesEndpoint = values.GetValueOrDefault("Endpoints:CognitiveServices", opts.CognitiveServicesEndpoint);
        opts.CognitiveServicesKey = values.GetValueOrDefault("Endpoints:CognitiveServices:Key", opts.CognitiveServicesKey);

        logger.LogInformation("Config refreshed from proxy at {Timestamp}", DateTime.UtcNow);
      }
      catch (Exception ex)
      {
        logger.LogWarning(ex, "Config refresh failed. Retrying in {Interval}.", RefreshInterval);
      }
    }
  }
}
