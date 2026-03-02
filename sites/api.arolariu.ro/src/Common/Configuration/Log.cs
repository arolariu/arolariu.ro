namespace arolariu.Backend.Common.Configuration;

using System;

using Microsoft.Extensions.Logging;

/// <summary>
/// Provides source-generated logging methods for configuration proxy refresh workflows.
/// </summary>
public static partial class Log
{
  /// <summary>
  /// Logs when the proxy returns no catalog and the cached version is reused.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="catalogVersion">The current cached catalog version.</param>
  [LoggerMessage(
    EventId = 410_100,
    Level = LogLevel.Warning,
    Message = "Catalog refresh returned no catalog. Continuing with cached catalog version {CatalogVersion}.")]
  public static partial void LogCatalogMissing(this ILogger logger, string catalogVersion);

  /// <summary>
  /// Logs when the proxy returns an empty required key set and the cached version is reused.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="catalogVersion">The current cached catalog version.</param>
  [LoggerMessage(
    EventId = 410_101,
    Level = LogLevel.Warning,
    Message = "Catalog refresh returned an empty required key set. Continuing with cached catalog version {CatalogVersion}.")]
  public static partial void LogEmptyCatalogReceived(this ILogger logger, string catalogVersion);

  /// <summary>
  /// Logs when refresh is skipped due to missing required keys in the cached catalog.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  [LoggerMessage(
    EventId = 410_102,
    Level = LogLevel.Warning,
    Message = "Catalog contains no required keys. Skipping refresh cycle.")]
  public static partial void LogNoRequiredKeys(this ILogger logger);

  /// <summary>
  /// Logs successful configuration refresh from the proxy.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  [LoggerMessage(
    EventId = 410_103,
    Level = LogLevel.Information,
    Message = "Config refreshed from proxy.")]
  public static partial void LogRefreshSucceeded(this ILogger logger);

  /// <summary>
  /// Logs refresh failures and next retry interval.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="exception">The exception encountered during refresh.</param>
  /// <param name="interval">The retry interval.</param>
  [LoggerMessage(
    EventId = 410_104,
    Level = LogLevel.Warning,
    Message = "Config refresh failed. Retrying in {Interval}.")]
  public static partial void LogRefreshFailed(this ILogger logger, Exception exception, TimeSpan interval);
}
