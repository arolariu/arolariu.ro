namespace arolariu.Backend.Common.Telemetry.Metering;

using System.Diagnostics.Metrics;

/// <summary>
/// Provides centralized <see cref="Meter"/> instances for custom metrics across application components.
/// This mirrors <see cref="Tracing.ActivityGenerators"/> which provides per-bounded-context <c>ActivitySource</c> instances.
/// </summary>
/// <remarks>
/// Each bounded context has its own <see cref="Meter"/> to ensure metric isolation and clear ownership:
/// <list type="bullet">
///   <item><see cref="CommonMeter"/> — Infrastructure metrics (config refresh, Key Vault, etc.)</item>
///   <item><see cref="CoreMeter"/> — Core application metrics (health checks, startup)</item>
///   <item><see cref="AuthMeter"/> — Authentication/authorization metrics (logins, token operations)</item>
///   <item><see cref="InvoiceMeter"/> — Invoice domain metrics (CRUD counts, analysis duration, RU cost)</item>
/// </list>
///
/// All meters are registered in <see cref="MeteringExtensions.AddOTelMetering"/> via <c>AddMeter()</c>.
/// </remarks>
/// <example>
/// <code>
/// // Creating a counter from the Invoice meter
/// private static readonly Counter&lt;long&gt; InvoicesCreated =
///     MeterGenerators.InvoiceMeter.CreateCounter&lt;long&gt;("invoices.created", description: "Total invoices created");
///
/// // Recording an observation
/// InvoicesCreated.Add(1, new KeyValuePair&lt;string, object?&gt;("user.id", userId.ToString()));
/// </code>
/// </example>
public static class MeterGenerators
{
  /// <summary>
  /// Meter for the Common package — infrastructure and configuration metrics.
  /// </summary>
  /// <value>
  /// A <see cref="Meter"/> with the name <c>arolariu.Backend.Common</c>.
  /// </value>
  public static readonly Meter CommonMeter = new("arolariu.Backend.Common", "1.0.0");

  /// <summary>
  /// Meter for the Core package — application lifecycle and health metrics.
  /// </summary>
  /// <value>
  /// A <see cref="Meter"/> with the name <c>arolariu.Backend.Core</c>.
  /// </value>
  public static readonly Meter CoreMeter = new("arolariu.Backend.Core", "1.0.0");

  /// <summary>
  /// Meter for the Authentication package — auth event metrics.
  /// </summary>
  /// <value>
  /// A <see cref="Meter"/> with the name <c>arolariu.Backend.Auth</c>.
  /// </value>
  public static readonly Meter AuthMeter = new("arolariu.Backend.Auth", "1.0.0");

  /// <summary>
  /// Meter for the Invoices domain package — business operation metrics.
  /// </summary>
  /// <value>
  /// A <see cref="Meter"/> with the name <c>arolariu.Backend.Domain.Invoices</c>.
  /// </value>
  public static readonly Meter InvoiceMeter = new("arolariu.Backend.Domain.Invoices", "1.0.0");
}
