namespace arolariu.Backend.Core.Tests.Common.Telemetry;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using arolariu.Backend.Common.Telemetry;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenTelemetry;
using OpenTelemetry.Trace;

/// <summary>
/// Integration tests that verify the ASP.NET Core instrumentation filter correctly
/// suppresses telemetry for health probe paths while preserving traces for real routes.
/// </summary>
[TestClass]
public sealed class HealthTraceFilterTests
{
  // ActivityListeners are global; serialize tests so only one OTel pipeline is active at a time.
  private static readonly SemaphoreSlim _gate = new(1, 1);

  /// <summary>
  /// Captures activities synchronously in <see cref="BaseProcessor{T}.OnEnd"/> and signals
  /// a <see cref="SemaphoreSlim"/> so the real-route test can await the first activity instead
  /// of polling a fixed deadline.
  /// </summary>
  private sealed class CapturingProcessor : BaseProcessor<Activity>
  {
    private readonly List<Activity> _target;
    private readonly SemaphoreSlim _signal = new(0, int.MaxValue);

    /// <summary>Initialises the processor with the shared capture list.</summary>
    public CapturingProcessor(List<Activity> target) => _target = target;

    /// <inheritdoc/>
    public override void OnEnd(Activity activity)
    {
      _target.Add(activity);
      _signal.Release();
    }

    /// <summary>
    /// Waits up to <paramref name="timeout"/> for at least one activity to be captured.
    /// </summary>
    public Task<bool> WaitForActivityAsync(TimeSpan timeout) =>
      _signal.WaitAsync(timeout);

    /// <inheritdoc/>
    protected override void Dispose(bool disposing)
    {
      if (disposing)
        _signal.Dispose();
      base.Dispose(disposing);
    }
  }

  private static async Task<List<Activity>> ExportedActivitiesForAsync(
    string requestPath,
    TimeSpan absenceGuard = default)
  {
    await _gate.WaitAsync().ConfigureAwait(false);
    try
    {
      var exported = new List<Activity>();
      using var processor = new CapturingProcessor(exported);

      var host = await new HostBuilder()
        .ConfigureWebHost(webBuilder =>
        {
          webBuilder.UseTestServer();
          webBuilder.ConfigureServices(services =>
            services.AddOpenTelemetry().WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation(options =>
                  options.Filter = httpContext =>
                    !HealthTelemetryPolicy.ShouldSuppress(httpContext.Request.Path.Value))
                .AddProcessor(processor)));
          webBuilder.Configure(app => app.Run(context =>
          {
            context.Response.StatusCode = 200;
            return Task.CompletedTask;
          }));
        })
        .StartAsync()
        .ConfigureAwait(false);

      try
      {
        using var client = host.GetTestClient();
        using var response = await client.GetAsync(new Uri(requestPath, UriKind.Relative))
          .ConfigureAwait(false);

        if (absenceGuard == default)
        {
          // Real-route path: wait until an activity arrives (up to 3s), then return immediately.
          await processor.WaitForActivityAsync(TimeSpan.FromSeconds(3)).ConfigureAwait(false);
        }
        else
        {
          // Absence-assertion path: wait a short, deliberate interval so that any activity
          // that the filter should have suppressed has time to arrive — if the filter is
          // misconfigured, the activity will appear during this window. The window only needs
          // to outlast the server-side DisposeContext async gap (measured in milliseconds),
          // so 400ms is a conservative upper bound without slowing the suite materially.
          await Task.Delay(absenceGuard).ConfigureAwait(false);
        }

        await host.StopAsync().ConfigureAwait(false);
      }
      finally
      {
        host.Dispose();
      }

      return exported;
    }
    finally
    {
      _gate.Release();
    }
  }

  /// <summary>
  /// Verifies that HTTP requests to health probe paths are excluded from distributed traces.
  /// </summary>
  [TestMethod]
  public async Task AspNetCoreFilter_HealthPath_ExportsNoActivity()
  {
    // Pass a 400ms absence-guard: any activity that leaked past the filter would arrive
    // during this window, making the assertion fail — preserving the deleted-filter guarantee.
    var exported = await ExportedActivitiesForAsync("/health", TimeSpan.FromMilliseconds(400))
      .ConfigureAwait(false);

    Assert.AreEqual(0, exported.Count, "Health requests must not export any activity.");
  }

  /// <summary>
  /// Verifies that HTTP requests to real application routes are still captured in distributed traces.
  /// </summary>
  [TestMethod]
  public async Task AspNetCoreFilter_RealRoute_ExportsActivity()
  {
    var exported = await ExportedActivitiesForAsync("/api/invoices").ConfigureAwait(false);

    Assert.AreEqual(1, exported.Count, "Real routes must still export telemetry.");
  }
}
