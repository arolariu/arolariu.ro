namespace arolariu.Backend.Common;

using System.Diagnostics.Metrics;

using arolariu.Backend.Common.Telemetry.Metering;

/// <summary>
/// Defines custom OTel metric instruments for the Common package (infrastructure metrics).
/// All instruments are created from <see cref="MeterGenerators.CommonMeter"/>.
/// </summary>
/// <remarks>
/// Metric naming follows OTel semantic conventions:
/// <list type="bullet">
///   <item><c>config.refresh.*</c> — Configuration proxy refresh cycle metrics</item>
/// </list>
/// </remarks>
public static class CommonMetrics
{
  private static readonly Meter Meter = MeterGenerators.CommonMeter;

  /// <summary>
  /// Total number of successful configuration refresh cycles.
  /// </summary>
  public static readonly Counter<long> ConfigRefreshSuccess =
    Meter.CreateCounter<long>("config.refresh.success", "events", "Total successful config refresh cycles.");

  /// <summary>
  /// Total number of failed configuration refresh cycles.
  /// </summary>
  public static readonly Counter<long> ConfigRefreshFailure =
    Meter.CreateCounter<long>("config.refresh.failure", "events", "Total failed config refresh cycles.");

  /// <summary>
  /// Duration of configuration refresh cycles in milliseconds.
  /// </summary>
  public static readonly Histogram<double> ConfigRefreshDuration =
    Meter.CreateHistogram<double>("config.refresh.duration", "ms", "Duration of configuration refresh cycles.");
}
