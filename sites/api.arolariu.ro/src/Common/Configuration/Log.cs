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

  /// <summary>
  /// Logs a non-success HTTP status code from the exp service for a config key.
  /// </summary>
  [LoggerMessage(
    EventId = 410_201,
    Level = LogLevel.Warning,
    Message = "exp returned HTTP {StatusCode} for config key '{Key}'.")]
  public static partial void LogConfigKeyHttpError(this ILogger logger, int statusCode, string key);

  /// <summary>
  /// Logs a network-level error when the exp service is unreachable.
  /// </summary>
  [LoggerMessage(
    EventId = 410_202,
    Level = LogLevel.Error,
    Message = "Network error fetching config key '{Key}' from exp — service may be unreachable.")]
  public static partial void LogConfigKeyNetworkError(this ILogger logger, Exception exception, string key);

  /// <summary>
  /// Logs a timeout when fetching a config key from the exp service.
  /// </summary>
  [LoggerMessage(
    EventId = 410_203,
    Level = LogLevel.Error,
    Message = "Timeout fetching config key '{Key}' from exp.")]
  public static partial void LogConfigKeyTimeout(this ILogger logger, Exception exception, string key);

  /// <summary>
  /// Logs a JSON deserialization failure for a config key response.
  /// </summary>
  [LoggerMessage(
    EventId = 410_204,
    Level = LogLevel.Error,
    Message = "Failed to deserialize exp response for config key '{Key}' — response may be malformed.")]
  public static partial void LogConfigKeyDeserializationError(this ILogger logger, Exception exception, string key);
}
