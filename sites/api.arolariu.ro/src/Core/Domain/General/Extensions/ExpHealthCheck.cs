namespace arolariu.Backend.Core.Domain.General.Extensions;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Configuration;

using Microsoft.Extensions.Diagnostics.HealthChecks;

/// <summary>
/// Reachability check for the exp config-proxy service.
/// </summary>
/// <remarks>
/// <para>
/// Calls <see cref="IConfigProxyClient.PingAsync"/> which hits exp's
/// <c>GET /api/ready</c> readiness endpoint over the API's existing typed HttpClient.
/// Reusing the production HttpClient is critical: it inherits dotnet's dev-cert trust,
/// the bearer-token handler (when targeting Azure), and the environment-aware
/// <c>BaseAddress</c> resolved from <c>EXP_PROXY_URL</c>. An isolated UriHealthCheck
/// would create its own HttpClient without dev-cert trust and fail TLS handshake
/// against Aspire DCP's self-signed cert.
/// </para>
/// <para>
/// In local Aspire mode the BaseAddress is <c>http(s)://localhost:5002</c>; in cloud
/// it's <c>https://exp.arolariu.ro</c>. The probe URL becomes
/// <c>{BaseAddress}/api/ready</c> with no further branching needed.
/// </para>
/// </remarks>
[SuppressMessage("Performance", "CA1812:Avoid uninstantiated internal classes",
    Justification = "Instantiated by the health-checks framework via DI through AddCheck<T>().")]
internal sealed class ExpHealthCheck(IConfigProxyClient configProxy) : IHealthCheck
{
  [SuppressMessage("Design", "CA1031:Do not catch general exception types",
      Justification = "Health checks must return Unhealthy for any failure, not propagate exceptions.")]
  public async Task<HealthCheckResult> CheckHealthAsync(
      HealthCheckContext context,
      CancellationToken cancellationToken = default)
  {
    try
    {
      var alive = await configProxy.PingAsync(cancellationToken).ConfigureAwait(false);
      return alive
          ? HealthCheckResult.Healthy("exp responded 2xx at /api/ready.")
          : HealthCheckResult.Unhealthy("exp /api/ready did not return a 2xx status.");
    }
    catch (Exception ex)
    {
      return HealthCheckResult.Unhealthy($"exp unreachable: {ex.Message}");
    }
  }
}
