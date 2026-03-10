namespace arolariu.Backend.Core.Domain.General.Extensions;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Diagnostics.HealthChecks;

/// <summary>
/// Lightweight health check that verifies CosmosDB endpoint reachability.
/// Uses a shared HttpClient to avoid socket exhaustion from repeated checks.
/// </summary>
internal sealed class CosmosDbHealthCheck(string endpoint) : IHealthCheck
{
  private static readonly HttpClient SharedClient = new() { Timeout = TimeSpan.FromSeconds(10) };

  [SuppressMessage("Design", "CA1031:Do not catch general exception types",
      Justification = "Health checks must return Unhealthy for any failure, not propagate exceptions.")]
  public async Task<HealthCheckResult> CheckHealthAsync(
      HealthCheckContext context,
      CancellationToken cancellationToken = default)
  {
    try
    {
      var response = await SharedClient.GetAsync(new Uri(endpoint), cancellationToken).ConfigureAwait(false);
      return response.IsSuccessStatusCode
        ? HealthCheckResult.Healthy($"CosmosDB reachable at {endpoint}")
        : HealthCheckResult.Degraded($"CosmosDB returned {response.StatusCode}");
    }
    catch (Exception ex)
    {
      return HealthCheckResult.Unhealthy($"CosmosDB unreachable: {ex.Message}");
    }
  }
}
