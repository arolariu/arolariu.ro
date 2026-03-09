namespace arolariu.Backend.Core.Domain.General.Extensions;

using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Diagnostics.HealthChecks;

/// <summary>
/// Lightweight health check that verifies CosmosDB endpoint reachability.
/// Uses an authenticated HTTP GET to the account root with Managed Identity.
/// </summary>
internal sealed class CosmosDbHealthCheck(string endpoint) : IHealthCheck
{
  public async Task<HealthCheckResult> CheckHealthAsync(
      HealthCheckContext context,
      CancellationToken cancellationToken = default)
  {
    try
    {
      using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
      var response = await client.GetAsync(new Uri(endpoint), cancellationToken).ConfigureAwait(false);
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
