namespace arolariu.Backend.Core.Tests.Common.Telemetry;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Http;
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
  private static readonly System.Threading.SemaphoreSlim _gate = new(1, 1);

  private static async Task<List<Activity>> ExportedActivitiesForAsync(string requestPath)
  {
    await _gate.WaitAsync().ConfigureAwait(false);
    try
    {
      var exported = new List<Activity>();

      var host = await new HostBuilder()
        .ConfigureWebHost(webBuilder =>
        {
          webBuilder.UseTestServer();
          webBuilder.ConfigureServices(services =>
            services.AddOpenTelemetry().WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation(options =>
                  options.Filter = httpContext =>
                    !HealthTelemetryPolicy.ShouldSuppress(httpContext.Request.Path.Value))
                .AddInMemoryExporter(exported)));
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
        var response = await client.GetAsync(new Uri(requestPath, UriKind.Relative))
          .ConfigureAwait(false);

        // The server-side activity lifecycle (DisposeContext) completes asynchronously
        // relative to the client receiving the response. Wait for it to finish before
        // stopping the host, so that SimpleActivityExportProcessor.OnEnd fires while
        // the TracerProvider is still alive and registered.
        response.Dispose();

        // Poll until the activity appears in exported, or until timeout.
        // For suppressed paths the loop exits quickly (nothing ever appears).
        var deadline = Environment.TickCount64 + 3_000;
        while (exported.Count == 0 && Environment.TickCount64 < deadline)
        {
          await Task.Delay(10).ConfigureAwait(false);
        }

        // Flush before stopping: StopAsync shuts down the hosted service that manages
        // TracerProvider; flushing first ensures all ended activities are exported.
        host.Services.GetRequiredService<TracerProvider>().ForceFlush(5000);
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
    var exported = await ExportedActivitiesForAsync("/health").ConfigureAwait(false);

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
