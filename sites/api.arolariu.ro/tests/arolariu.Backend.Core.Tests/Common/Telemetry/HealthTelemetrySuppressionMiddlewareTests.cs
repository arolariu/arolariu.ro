namespace arolariu.Backend.Core.Tests.Common.Telemetry;

using System;
using System.Threading.Tasks;
using arolariu.Backend.Core.Domain.General.Middlewares;
using Microsoft.AspNetCore.Http;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenTelemetry;

/// <summary>
/// Unit tests for <see cref="HealthTelemetrySuppressionMiddleware"/> verifying suppression scope
/// behaviour for health probe paths and normal routes.
/// </summary>
[TestClass]
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
}
