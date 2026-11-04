namespace AppHost.Tests.LocalDevelopment.Reset.Fixtures;

using System.Data.Common;
using System.Net;
using System.Net.Sockets;

/// <summary>Holds only the real Bootstrap's next SDK connection so cancellation can be observed deterministically.</summary>
internal sealed class BootstrapConnectionGate : IAsyncDisposable
{
  private readonly TcpListener listener = new(IPAddress.Loopback, 0);
  private readonly CancellationTokenSource stopping = new();
  private readonly List<Task> connections = [];
  private readonly Task accepting;
  private Uri? target;
  private int hold;
  internal TaskCompletionSource Held { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
  internal TaskCompletionSource Disconnected { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

  internal BootstrapConnectionGate()
  {
    listener.Start();
    accepting = AcceptAsync();
  }

  internal void HoldConnections() => Volatile.Write(ref hold, 1);

  internal string Redirect(string connectionString)
  {
    var settings = new DbConnectionStringBuilder { ConnectionString = connectionString };
    target = new Uri((string)settings["AccountEndpoint"]);
    Uri redirected = new UriBuilder(target)
    {
      Port = ((IPEndPoint)listener.LocalEndpoint).Port,
    }.Uri;
    return string.Join(';', connectionString.Split(';').Select(segment =>
      segment.StartsWith("AccountEndpoint=", StringComparison.OrdinalIgnoreCase) ? $"AccountEndpoint={redirected}" : segment));
  }

  public async ValueTask DisposeAsync()
  {
    await stopping.CancelAsync();
    listener.Stop();
    try { await accepting; }
    catch (OperationCanceledException) { }
    await Task.WhenAll(connections);
    stopping.Dispose();
  }

  private async Task AcceptAsync()
  {
    while (!stopping.IsCancellationRequested)
    {
      TcpClient incoming = await listener.AcceptTcpClientAsync(stopping.Token);
      connections.Add(ForwardAsync(incoming));
    }
  }

  private async Task ForwardAsync(TcpClient incoming)
  {
    using (incoming)
    {
      try
      {
        if (Volatile.Read(ref hold) != 0)
        {
          Held.TrySetResult();
          try { await incoming.GetStream().CopyToAsync(Stream.Null, stopping.Token); }
          finally
          {
            if (!stopping.IsCancellationRequested) { Disconnected.TrySetResult(); }
          }
          return;
        }
        Uri destination = target ?? throw new InvalidOperationException("The native target was not allocated.");
        using var outgoing = new TcpClient();
        await outgoing.ConnectAsync(destination.Host, destination.Port, stopping.Token);
        Task toStore = incoming.GetStream().CopyToAsync(outgoing.GetStream(), stopping.Token);
        Task toBootstrap = outgoing.GetStream().CopyToAsync(incoming.GetStream(), stopping.Token);
        await Task.WhenAny(toStore, toBootstrap);
        incoming.Close();
        outgoing.Close();
        try { await Task.WhenAll(toStore, toBootstrap); }
        catch (Exception exception) when (exception is IOException or ObjectDisposedException or OperationCanceledException) { }
      }
      catch (Exception exception) when (exception is IOException or SocketException or OperationCanceledException) { }
    }
  }
}
