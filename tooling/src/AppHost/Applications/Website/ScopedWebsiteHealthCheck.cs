namespace AppHost.Applications.Website;

using System.Net;
using System.Net.Sockets;
using Microsoft.Extensions.Diagnostics.HealthChecks;

/// <summary>Probes the browser's exact HTTPS authority without resolving or following another origin.</summary>
internal sealed class ScopedWebsiteHealthCheck(Uri address) : IHealthCheck
{
  private static readonly HttpClient Client = new(new SocketsHttpHandler
  {
    AllowAutoRedirect = false,
    UseProxy = false,
    PooledConnectionLifetime = TimeSpan.Zero,
    ConnectCallback = ConnectLoopbackAsync,
  }) { Timeout = TimeSpan.FromSeconds(10) };

  public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
  {
    using HttpResponseMessage response = await Client.GetAsync(address, HttpCompletionOption.ResponseHeadersRead, cancellationToken)
      .ConfigureAwait(false);
    return response.StatusCode == HttpStatusCode.OK
      ? HealthCheckResult.Healthy()
      : HealthCheckResult.Unhealthy("The scoped website did not return HTTP 200.");
  }

  private static async ValueTask<Stream> ConnectLoopbackAsync(SocketsHttpConnectionContext context, CancellationToken cancellationToken)
  {
    var socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
    try
    {
      await socket.ConnectAsync(new IPEndPoint(IPAddress.Loopback, context.DnsEndPoint.Port), cancellationToken).ConfigureAwait(false);
      return new NetworkStream(socket, ownsSocket: true);
    }
    catch
    {
      socket.Dispose();
      throw;
    }
  }
}
