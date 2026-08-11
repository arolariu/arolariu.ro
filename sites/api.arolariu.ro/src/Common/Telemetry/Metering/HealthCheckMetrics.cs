namespace arolariu.Backend.Common.Telemetry.Metering;

using System;
using System.Collections.Generic;
using System.Diagnostics.Metrics;

/// <summary>
/// Emits the single always-on signal that survives health telemetry suppression.
/// </summary>
/// <remarks>
/// All other health telemetry is dropped. This counter stays enabled because its volume is
/// effectively zero until a dependency actually fails. The metric name is deliberately shared
/// verbatim with the website and exp services so a single query spans the estate; the
/// <c>service.name</c> resource attribute distinguishes the source.
/// </remarks>
public static class HealthCheckMetrics
{
  /// <summary>
  /// The <see cref="Microsoft.AspNetCore.Http.HttpContext.Items"/> key used to hand failing
  /// check names from the health check response writer to the suppression middleware.
  /// </summary>
  public const string FailedChecksItemKey = "arolariu.health.failed-checks";

  /// <summary>
  /// The exported metric name.
  /// </summary>
  public const string MetricName = "arolariu.health.check.failures";

  private static readonly Counter<long> FailureCounter =
    MeterGenerators.CoreMeter.CreateCounter<long>(
      MetricName,
      unit: "{failure}",
      description: "Health check failures, dimensioned by the failing check name.");

  /// <summary>
  /// Records one measurement per failing health check.
  /// </summary>
  /// <param name="failedCheckNames">The names of the health checks that reported failure.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="failedCheckNames"/> is null.</exception>
  /// <remarks>
  /// Must be called outside any active <c>SuppressInstrumentationScope</c>, otherwise the
  /// measurement may be discarded along with the suppressed request telemetry.
  /// </remarks>
  public static void RecordFailures(IEnumerable<string> failedCheckNames)
  {
    ArgumentNullException.ThrowIfNull(failedCheckNames);

    foreach (var checkName in failedCheckNames)
    {
      FailureCounter.Add(1, new KeyValuePair<string, object?>("check", checkName));
    }
  }
}
