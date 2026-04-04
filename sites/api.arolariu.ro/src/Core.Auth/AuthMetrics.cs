namespace arolariu.Backend.Core.Auth;

using System.Collections.Generic;
using System.Diagnostics.Metrics;

using arolariu.Backend.Common.Telemetry.Metering;

/// <summary>
/// Defines custom OTel metric instruments for the Core.Auth bounded context.
/// All instruments are created from <see cref="MeterGenerators.AuthMeter"/>.
/// </summary>
/// <remarks>
/// Metric naming follows OTel semantic conventions:
/// <list type="bullet">
///   <item><c>auth.logouts</c> — Successful logout events</item>
///   <item><c>auth.logout_failures</c> — Failed logout attempts</item>
///   <item><c>auth.jwt.*</c> — JWT token validation metrics</item>
/// </list>
/// </remarks>
public static class AuthMetrics
{
  private static readonly Meter Meter = MeterGenerators.AuthMeter;

  /// <summary>
  /// Total number of successful user logouts.
  /// </summary>
  public static readonly Counter<long> Logouts =
    Meter.CreateCounter<long>("auth.logouts", "events", "Total successful user logouts.");

  /// <summary>
  /// Total number of failed logout attempts.
  /// </summary>
  public static readonly Counter<long> LogoutFailures =
    Meter.CreateCounter<long>("auth.logout_failures", "events", "Total failed logout attempts.");

  /// <summary>
  /// Total number of JWT validation failures.
  /// Tag with <c>reason</c> to distinguish failure types (invalid_issuer, invalid_audience, missing_secret).
  /// </summary>
  public static readonly Counter<long> JwtValidationFailures =
    Meter.CreateCounter<long>("auth.jwt.validation_failures", "events", "Total JWT token validation failures.");

  /// <summary>
  /// Records a JWT validation failure with a reason tag.
  /// </summary>
  /// <param name="reason">The failure reason (e.g., invalid_issuer, invalid_audience, missing_secret).</param>
  public static void RecordJwtFailure(string reason)
  {
    JwtValidationFailures.Add(1, new KeyValuePair<string, object?>("reason", reason));
  }
}
