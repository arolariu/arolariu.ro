namespace arolariu.Backend.Common.Configuration;

using System;

using Microsoft.Extensions.Logging;

/// <summary>
/// Provides source-generated logging methods for configuration proxy refresh workflows.
/// </summary>
public static partial class Log
{
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
  /// Logs when config values are unavailable during a refresh cycle.
  /// Config and feature snapshots are retained from the previous cycle.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  [LoggerMessage(
    EventId = 410_105,
    Level = LogLevel.Warning,
    Message = "Config refresh returned no config values. Config and feature snapshots unchanged.")]
  public static partial void LogBootstrapMissing(this ILogger logger);

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
