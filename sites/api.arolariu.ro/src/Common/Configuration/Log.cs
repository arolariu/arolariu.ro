namespace arolariu.Backend.Common.Configuration;

using System;

using Microsoft.Extensions.Logging;

/// <summary>
/// Provides source-generated logging methods for configuration proxy refresh workflows.
/// </summary>
public static partial class Log
{
  /// <summary>
  /// Logs when the proxy returns no build-time configuration document and the cached version is reused.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="documentVersion">The current cached build-time document version.</param>
  [LoggerMessage(
    EventId = 410_100,
    Level = LogLevel.Warning,
    Message = "Build-time refresh returned no configuration document. Continuing with cached document version {DocumentVersion}.")]
  public static partial void LogCatalogMissing(this ILogger logger, string documentVersion);

  /// <summary>
  /// Logs when the proxy returns an empty build-time configuration document and the cached version is reused.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="documentVersion">The current cached build-time document version.</param>
  [LoggerMessage(
    EventId = 410_101,
    Level = LogLevel.Warning,
    Message = "Build-time refresh returned an empty configuration document. Continuing with cached document version {DocumentVersion}.")]
  public static partial void LogEmptyCatalogReceived(this ILogger logger, string documentVersion);

  /// <summary>
  /// Logs when refresh is skipped because the cached build-time document contains no configuration values.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  [LoggerMessage(
    EventId = 410_102,
    Level = LogLevel.Warning,
    Message = "Build-time configuration document contains no values. Skipping refresh cycle.")]
  public static partial void LogNoRequiredKeys(this ILogger logger);

  /// <summary>
  /// Logs successful configuration and feature refresh from the proxy.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  [LoggerMessage(
    EventId = 410_103,
    Level = LogLevel.Information,
    Message = "Config and features refreshed from proxy.")]
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

  /// <summary>
  /// Logs when the bootstrap payload is unavailable during a refresh cycle.
  /// Config and feature snapshots are retained from the previous cycle.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  [LoggerMessage(
    EventId = 410_105,
    Level = LogLevel.Warning,
    Message = "Bootstrap refresh returned no payload. Config and feature snapshots unchanged.")]
  public static partial void LogBootstrapMissing(this ILogger logger);

  /// <summary>
  /// Logs the successful seeding of the feature snapshot cache from the bootstrap payload at startup.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="featureCount">The number of feature flags loaded into the snapshot cache.</param>
  [LoggerMessage(
    EventId = 410_106,
    Level = LogLevel.Information,
    Message = "Feature snapshot cache seeded from bootstrap with {FeatureCount} feature flag(s).")]
  public static partial void LogFeatureSnapshotSeeded(this ILogger logger, int featureCount);

  /// <summary>
  /// Logs the successful update of the feature snapshot cache during a refresh cycle.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="featureCount">The number of feature flags in the updated snapshot.</param>
  [LoggerMessage(
    EventId = 410_107,
    Level = LogLevel.Information,
    Message = "Feature snapshot cache updated with {FeatureCount} feature flag(s).")]
  public static partial void LogFeatureSnapshotUpdated(this ILogger logger, int featureCount);
}
