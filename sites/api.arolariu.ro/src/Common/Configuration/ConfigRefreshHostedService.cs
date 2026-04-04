namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Common.Telemetry.Tracing;

using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

/// <summary>
/// Background service that periodically refreshes configuration values from the exp proxy
/// by fetching each config key individually.
/// </summary>
/// <remarks>
/// <para>On each cycle the service:
/// <list type="number">
///   <item><description>Waits for the configured refresh interval (default 300 seconds, minimum 60 seconds).</description></item>
///   <item><description>Fetches each of the <see cref="ConfigKeys"/> individually via <see cref="IConfigProxyClient.GetConfigValueAsync"/>.</description></item>
///   <item><description>Swaps the <see cref="AzureOptions"/> snapshot via <see cref="IOptionsMonitorCache{TOptions}"/>.</description></item>
/// </list>
/// </para>
/// <para>If the refresh fails the error is logged and the previous snapshot is preserved.</para>
/// </remarks>
/// <param name="proxyClient">The config proxy client used to fetch individual config values.</param>
/// <param name="featureSnapshotCache">The in-memory feature flag snapshot cache (retained for future use).</param>
/// <param name="optionsMonitor">The options monitor for reading the current <see cref="AzureOptions"/> snapshot.</param>
/// <param name="optionsCache">The options cache used to atomically swap refreshed option snapshots.</param>
/// <param name="logger">The logger for recording refresh events and errors.</param>
public sealed class ConfigRefreshHostedService(
    IConfigProxyClient proxyClient,
    FeatureSnapshotCache featureSnapshotCache,
    IOptionsMonitor<AzureOptions> optionsMonitor,
    IOptionsMonitorCache<AzureOptions> optionsCache,
    ILogger<ConfigRefreshHostedService> logger) : BackgroundService
{
  /// <summary>Default refresh interval in seconds.</summary>
  private const int DefaultRefreshIntervalSeconds = 300;

  /// <summary>The canonical config key names fetched on each refresh cycle.</summary>
  private static readonly string[] ConfigKeys = [
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

  // Suppress IDE warning – featureSnapshotCache is retained for future feature-flag refresh support.
#pragma warning disable CA1823 // Avoid unused private fields
  private readonly FeatureSnapshotCache _featureSnapshotCache = featureSnapshotCache;
#pragma warning restore CA1823

  /// <inheritdoc />
  protected override async Task ExecuteAsync(CancellationToken stoppingToken)
  {
    var refreshInterval = TimeSpan.FromSeconds(Math.Max(60, DefaultRefreshIntervalSeconds));

    // Initial short delay to let the DI container finish building before first refresh.
    await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken).ConfigureAwait(false);

    while (!stoppingToken.IsCancellationRequested)
    {
      var sw = Stopwatch.StartNew();
      try
      {
        using var activity = ActivityGenerators.CommonPackageTracing.StartActivity("exp.config.refresh-cycle");
        activity?.SetTag("config.keys.count", ConfigKeys.Length);

        // Fetch each config key individually and collect results.
        var configValues = new Dictionary<string, string>(ConfigKeys.Length);
        foreach (var key in ConfigKeys)
        {
          var response = await proxyClient.GetConfigValueAsync(key, label: "PRODUCTION", stoppingToken).ConfigureAwait(false);
          if (response is not null)
          {
            configValues[key] = response.Value;
          }
        }

        if (configValues.Count == 0)
        {
          activity?.SetStatus(ActivityStatusCode.Error, "no keys returned");
          activity?.SetTag("config.resolved.count", 0);
          logger.LogBootstrapMissing();
          CommonMetrics.ConfigRefreshFailure.Add(1);
          continue;
        }

        activity?.SetTag("config.resolved.count", configValues.Count);

        // Swap AzureOptions snapshot atomically.
        var refreshedOptions = CloneAzureOptions(optionsMonitor.CurrentValue);
        ApplyRefreshedValues(refreshedOptions, configValues);
        lock (optionsCache)
        {
          optionsCache.TryRemove(Options.DefaultName);
          optionsCache.TryAdd(Options.DefaultName, refreshedOptions);
        }

        CommonMetrics.ConfigRefreshSuccess.Add(1);
        logger.LogRefreshSucceeded();
      }
      catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
      {
        break;
      }
      catch (HttpRequestException ex)
      {
        CommonMetrics.ConfigRefreshFailure.Add(1);
        logger.LogRefreshFailed(ex, refreshInterval);
      }
      catch (JsonException ex)
      {
        CommonMetrics.ConfigRefreshFailure.Add(1);
        logger.LogRefreshFailed(ex, refreshInterval);
      }
      catch (InvalidOperationException ex)
      {
        CommonMetrics.ConfigRefreshFailure.Add(1);
        logger.LogRefreshFailed(ex, refreshInterval);
      }
      catch (TaskCanceledException ex)
      {
        CommonMetrics.ConfigRefreshFailure.Add(1);
        logger.LogRefreshFailed(ex, refreshInterval);
      }
      finally
      {
        sw.Stop();
        CommonMetrics.ConfigRefreshDuration.Record(sw.Elapsed.TotalMilliseconds);
      }

      // Wait for the configured interval before the next refresh cycle.
      await Task.Delay(refreshInterval, stoppingToken).ConfigureAwait(false);
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
    options.SqlConnectionString = values.GetValueOrDefault("Endpoints:Database:SQL", options.SqlConnectionString);
    options.NoSqlConnectionString = values.GetValueOrDefault("Endpoints:Database:NoSQL", options.NoSqlConnectionString);
    options.StorageAccountEndpoint = values.GetValueOrDefault("Endpoints:Storage:Blob", options.StorageAccountEndpoint);
    options.ApplicationInsightsEndpoint = values.GetValueOrDefault("Endpoints:Observability:Telemetry", options.ApplicationInsightsEndpoint);
    options.CognitiveServicesEndpoint = values.GetValueOrDefault("Endpoints:AI:OCR", options.CognitiveServicesEndpoint);
    options.CognitiveServicesKey = values.GetValueOrDefault("Endpoints:AI:OCR:Key", options.CognitiveServicesKey);
  }

  private static AzureOptions CloneAzureOptions(AzureOptions source)
  {
    return new AzureOptions
    {
      TenantId = source.TenantId,
      SecretsEndpoint = source.SecretsEndpoint,
      ConfigurationEndpoint = source.ConfigurationEndpoint,
      StorageAccountName = source.StorageAccountName,
      StorageAccountEndpoint = source.StorageAccountEndpoint,
      SqlConnectionString = source.SqlConnectionString,
      NoSqlConnectionString = source.NoSqlConnectionString,
      ApplicationInsightsEndpoint = source.ApplicationInsightsEndpoint,
      CognitiveServicesEndpoint = source.CognitiveServicesEndpoint,
      CognitiveServicesKey = source.CognitiveServicesKey,
      JwtIssuer = source.JwtIssuer,
      JwtAudience = source.JwtAudience,
      JwtSecret = source.JwtSecret,
      ApplicationName = source.ApplicationName,
      ApplicationVersion = source.ApplicationVersion,
      ApplicationDescription = source.ApplicationDescription,
      ApplicationAuthor = source.ApplicationAuthor,
      TermsAndConditions = source.TermsAndConditions,
    };
  }
}
