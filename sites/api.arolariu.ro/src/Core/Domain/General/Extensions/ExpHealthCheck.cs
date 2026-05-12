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
/// Uses the API's existing <see cref="IConfigProxyClient"/> (same typed HttpClient as the
/// main config-fetch flow) so it shares dev-cert trust and connection-pool state. An
/// isolated <c>AddUrlGroup</c> probe would create its own HttpClient without trust for
/// Aspire's DCP self-signed dev cert and would fail with "SSL connection could not be
/// established" even when the API itself talks to exp successfully.
/// </para>
/// <para>
/// Verifies the full GET <c>/api/v1/config?name=Site:Environment</c> round trip — a
/// static, always-present key — confirming both transport reachability and that exp's
/// config-resolver pipeline is wired.
/// </para>
/// </remarks>
[SuppressMessage("Performance", "CA1812:Avoid uninstantiated internal classes",
    Justification = "Instantiated by the health-checks framework via DI through AddCheck<T>().")]
internal sealed class ExpHealthCheck(IConfigProxyClient configProxy) : IHealthCheck
{
  private const string ProbeKey = "Site:Environment";
  private const string ProbeLabel = "PRODUCTION";

  [SuppressMessage("Design", "CA1031:Do not catch general exception types",
      Justification = "Health checks must return Unhealthy for any failure, not propagate exceptions.")]
  public async Task<HealthCheckResult> CheckHealthAsync(
      HealthCheckContext context,
      CancellationToken cancellationToken = default)
  {
    try
    {
      var result = await configProxy
          .GetConfigValueAsync(ProbeKey, label: ProbeLabel, ct: cancellationToken)
          .ConfigureAwait(false);

      if (result is null)
      {
        return HealthCheckResult.Unhealthy(
            $"exp returned null for {ProbeKey} — service unreachable or the key is missing.");
      }

      return string.IsNullOrWhiteSpace(result.Value)
          ? HealthCheckResult.Degraded($"exp returned an empty value for {ProbeKey}.")
          : HealthCheckResult.Healthy($"exp reachable; {ProbeKey} = '{result.Value}'.");
    }
    catch (Exception ex)
    {
      return HealthCheckResult.Unhealthy($"exp unreachable: {ex.Message}");
    }
  }
}
