namespace arolariu.Backend.Core.Domain.General.Middlewares;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using arolariu.Backend.Common.Telemetry;
using arolariu.Backend.Common.Telemetry.Metering;
using Microsoft.AspNetCore.Http;
using OpenTelemetry;

/// <summary>
/// Suppresses all OpenTelemetry instrumentation for health and connectivity probe requests.
/// </summary>
/// <remarks>
/// Filtering only the ASP.NET Core server span is insufficient: the registered health checks
/// fan out to SQL Server, Blob Storage, Cosmos DB and the exp config proxy, each independently
/// instrumented. Without a recorded parent those emit orphaned root spans. Wrapping the whole
/// request in a suppression scope removes the entire subtree.
/// </remarks>
/// <param name="next">The next delegate in the request pipeline.</param>
internal sealed class HealthTelemetrySuppressionMiddleware(RequestDelegate next)
{
  private readonly RequestDelegate next = next
    ?? throw new ArgumentNullException(nameof(next));

  /// <summary>
  /// Invokes the middleware for the current request.
  /// </summary>
  /// <param name="context">The current <see cref="HttpContext"/>.</param>
  /// <returns>A task representing the asynchronous pipeline execution.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="context"/> is null.</exception>
  public async Task InvokeAsync(HttpContext context)
  {
    ArgumentNullException.ThrowIfNull(context);

    if (!HealthTelemetryPolicy.ShouldSuppress(context.Request.Path.Value))
    {
      await this.next(context).ConfigureAwait(false);
      return;
    }

    using (SuppressInstrumentationScope.Begin())
    {
      await this.next(context).ConfigureAwait(false);
    }

    // Recorded only after the scope is disposed — inside it, the measurement could be
    // discarded by the very mechanism that suppresses the request telemetry.
    if (context.Items.TryGetValue(HealthCheckMetrics.FailedChecksItemKey, out var failed)
        && failed is IEnumerable<string> failedCheckNames)
    {
      HealthCheckMetrics.RecordFailures(failedCheckNames);
    }
  }
}
