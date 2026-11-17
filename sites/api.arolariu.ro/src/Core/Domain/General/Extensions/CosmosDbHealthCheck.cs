namespace arolariu.Backend.Core.Domain.General.Extensions;

using System.Threading;
using System.Threading.Tasks;

using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Diagnostics.HealthChecks;

/// <summary>
/// Verifies authenticated access to the application database through the shared Cosmos client.
/// </summary>
internal sealed class CosmosDbHealthCheck(CosmosClient client) : IHealthCheck
{
  /// <inheritdoc />
  public async Task<HealthCheckResult> CheckHealthAsync(
      HealthCheckContext context,
      CancellationToken cancellationToken = default)
  {
    await client.GetDatabase("primary").ReadAsync(cancellationToken: cancellationToken)
      .WaitAsync(cancellationToken).ConfigureAwait(false);
    return HealthCheckResult.Healthy("CosmosDB application database is accessible.");
  }
}
