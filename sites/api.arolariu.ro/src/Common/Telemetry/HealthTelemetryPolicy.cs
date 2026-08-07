namespace arolariu.Backend.Common.Telemetry;

using System;

/// <summary>
/// Central policy deciding whether OpenTelemetry signals should be suppressed for a request path.
/// </summary>
/// <remarks>
/// Health and connectivity probes dominate request volume without carrying diagnostic value.
/// This policy is consulted by trace filters, the suppression middleware, and log filtering so
/// that the suppressed path list is defined exactly once for this service.
/// </remarks>
public static class HealthTelemetryPolicy
{
  /// <summary>
  /// The environment variable controlling whether health telemetry suppression is active.
  /// </summary>
  /// <remarks>Defaults to enabled. Only the literal value <c>false</c> disables suppression.</remarks>
  public const string SuppressionEnvVar = "OTEL_SUPPRESS_HEALTH_TELEMETRY";

  private static readonly string[] SuppressedPaths = ["/health", "/api/health", "/api/ready"];

  /// <summary>
  /// Gets a value indicating whether suppression is enabled for the current process.
  /// </summary>
  /// <value><see langword="true"/> unless <see cref="SuppressionEnvVar"/> is set to <c>false</c>.</value>
  public static bool IsSuppressionEnabled { get; } =
    ParseSuppressionFlag(Environment.GetEnvironmentVariable(SuppressionEnvVar));

  /// <summary>
  /// Determines whether the supplied path is one of the suppressed health endpoints.
  /// </summary>
  /// <param name="path">The request path, with or without a query string.</param>
  /// <returns><see langword="true"/> when the path matches a suppressed endpoint.</returns>
  /// <remarks>Matching is exact on the normalized path, never prefix-based.</remarks>
  public static bool IsSuppressedPath(string? path)
  {
    if (string.IsNullOrWhiteSpace(path))
    {
      return false;
    }

    var normalized = Normalize(path);
    foreach (var candidate in SuppressedPaths)
    {
      if (string.Equals(normalized, candidate, StringComparison.OrdinalIgnoreCase))
      {
        return true;
      }
    }

    return false;
  }

  /// <summary>
  /// Parses the raw suppression environment variable value.
  /// </summary>
  /// <param name="rawValue">The raw environment variable value, possibly null or malformed.</param>
  /// <returns><see langword="false"/> only when <paramref name="rawValue"/> parses as <c>false</c>.</returns>
  /// <remarks>Unset and unparseable values resolve to the safe default of enabled suppression.</remarks>
  public static bool ParseSuppressionFlag(string? rawValue)
  {
    if (string.IsNullOrWhiteSpace(rawValue))
    {
      return true;
    }

    return !bool.TryParse(rawValue, out var parsed) || parsed;
  }

  /// <summary>
  /// Determines whether telemetry should be suppressed for the supplied path.
  /// </summary>
  /// <param name="path">The request path, with or without a query string.</param>
  /// <returns><see langword="true"/> when telemetry must be suppressed.</returns>
  /// <remarks>Fails open: any unexpected condition resolves to emitting telemetry.</remarks>
  public static bool ShouldSuppress(string? path) =>
    IsSuppressionEnabled && IsSuppressedPath(path);

  private static string Normalize(string path)
  {
    var queryIndex = path.IndexOf('?', StringComparison.Ordinal);
    var withoutQuery = queryIndex >= 0 ? path[..queryIndex] : path;
    return withoutQuery.Length > 1 ? withoutQuery.TrimEnd('/') : withoutQuery;
  }
}
