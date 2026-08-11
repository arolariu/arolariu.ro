namespace arolariu.Backend.Core.Tests.Common.Telemetry;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using arolariu.Backend.Common.Telemetry.Metering;
using arolariu.Backend.Core.Domain.General.Middlewares;
using Microsoft.AspNetCore.Http;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenTelemetry;
using OpenTelemetry.Metrics;

/// <summary>
/// Unit tests for <see cref="HealthTelemetrySuppressionMiddleware"/> verifying suppression scope
/// behaviour for health probe paths and normal routes.
/// </summary>
/// <remarks>
/// Not parallelized: the failure counter is a static instrument on a process-global meter, so a
/// concurrently-alive <c>MeterProvider</c> in another class would observe these measurements too.
/// </remarks>
[TestClass]
[DoNotParallelize]
public sealed class HealthTelemetrySuppressionMiddlewareTests
{
  /// <summary>
  /// Verifies that a request to <c>/health</c> executes inside a suppression scope
  /// and that the scope does not leak after the request completes.
  /// </summary>
  [TestMethod]
  public async Task InvokeAsync_HealthPath_SuppressesInstrumentationScope()
  {
    var observedSuppression = false;
    var middleware = new HealthTelemetrySuppressionMiddleware(_ =>
    {
      observedSuppression = Sdk.SuppressInstrumentation;
      return Task.CompletedTask;
    });

    var context = new DefaultHttpContext();
    context.Request.Path = "/health";

    await middleware.InvokeAsync(context).ConfigureAwait(false);

    Assert.IsTrue(observedSuppression, "Health requests must execute inside a suppression scope.");
    Assert.IsFalse(Sdk.SuppressInstrumentation, "Suppression must not leak past the request.");
  }

  /// <summary>
  /// Verifies that a request to a real API route does not activate the suppression scope.
  /// </summary>
  [TestMethod]
  public async Task InvokeAsync_RealRoute_DoesNotSuppress()
  {
    var observedSuppression = true;
    var middleware = new HealthTelemetrySuppressionMiddleware(_ =>
    {
      observedSuppression = Sdk.SuppressInstrumentation;
      return Task.CompletedTask;
    });

    var context = new DefaultHttpContext();
    context.Request.Path = "/api/invoices";

    await middleware.InvokeAsync(context).ConfigureAwait(false);

    Assert.IsFalse(observedSuppression, "Real routes must be instrumented normally.");
  }

  /// <summary>
  /// Verifies that a throwing request to <c>/health</c> does not leave a leaked suppression scope.
  /// </summary>
  [TestMethod]
  public async Task InvokeAsync_HealthPathThrows_DoesNotLeakSuppression()
  {
    var middleware = new HealthTelemetrySuppressionMiddleware(
      _ => throw new InvalidOperationException("boom"));

    var context = new DefaultHttpContext();
    context.Request.Path = "/health";

    await Assert.ThrowsExactlyAsync<InvalidOperationException>(
      () => middleware.InvokeAsync(context)).ConfigureAwait(false);

    Assert.IsFalse(Sdk.SuppressInstrumentation, "A throwing request must not leak a suppressed scope.");
  }

  /// <summary>
  /// Verifies that the failure counter is recorded for a suppressed health path. Regression
  /// guard: an earlier implementation early-returned before the recording block whenever
  /// suppression was inactive, silently disabling the one signal meant to always survive.
  /// </summary>
  [TestMethod]
  public async Task InvokeAsync_HealthPathWithFailedChecks_RecordsFailures()
  {
    var exported = new List<Metric>();
    using var provider = Sdk.CreateMeterProviderBuilder()
      .AddMeter("arolariu.Backend.Core")
      .AddInMemoryExporter(exported)
      .Build()!;

    var middleware = new HealthTelemetrySuppressionMiddleware(ctx =>
    {
      ctx.Items[HealthCheckMetrics.FailedChecksItemKey] = new List<string> { "mssql" };
      return Task.CompletedTask;
    });

    var context = new DefaultHttpContext();
    context.Request.Path = "/health";

    await middleware.InvokeAsync(context).ConfigureAwait(false);
    provider.ForceFlush();

    var metric = exported.Find(m => m.Name == HealthCheckMetrics.MetricName);
    Assert.IsNotNull(metric, "The failure counter must be recorded for a failing health probe.");
  }

  /// <summary>
  /// Verifies that a non-health route is left entirely alone: no suppression scope, and no
  /// failure-counter bookkeeping even if something placed a failed-check list on the context.
  /// </summary>
  [TestMethod]
  public async Task InvokeAsync_RealRouteWithFailedChecks_RecordsNothing()
  {
    var exported = new List<Metric>();
    using var provider = Sdk.CreateMeterProviderBuilder()
      .AddMeter("arolariu.Backend.Core")
      .AddInMemoryExporter(exported)
      .Build()!;

    var middleware = new HealthTelemetrySuppressionMiddleware(ctx =>
    {
      ctx.Items[HealthCheckMetrics.FailedChecksItemKey] = new List<string> { "mssql" };
      return Task.CompletedTask;
    });

    var context = new DefaultHttpContext();
    context.Request.Path = "/api/invoices";

    await middleware.InvokeAsync(context).ConfigureAwait(false);
    provider.ForceFlush();

    var metric = exported.Find(m => m.Name == HealthCheckMetrics.MetricName);
    Assert.IsNull(metric, "Non-health routes must not feed the health failure counter.");
  }
}
