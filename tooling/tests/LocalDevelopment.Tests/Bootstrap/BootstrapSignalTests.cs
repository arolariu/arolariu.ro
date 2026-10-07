namespace LocalDevelopment.Tests.Bootstrap;

using System.Diagnostics;
using System.Globalization;
using System.Net;
using System.Net.Sockets;
using System.Runtime.Versioning;
using global::LocalDevelopment.Bootstrap.Configuration;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies OS signals reach the real bootstrap process without touching emulator data.</summary>
[TestClass]
public sealed class BootstrapSignalTests
{
  /// <summary>Verifies SIGTERM cancels an in-flight storage operation and exits cooperatively.</summary>
  [TestMethod]
  [UnsupportedOSPlatform("windows")]
  public async Task Main_SigtermDuringStorageProvisioning_ExitsCooperativelyWithoutNextPhase()
  {
    if (OperatingSystem.IsWindows()) { Assert.Inconclusive("SIGTERM requires a Unix process runtime."); }
    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
    var listener = new TcpListener(IPAddress.Loopback, 0);
    listener.Start();
    Process? child = null;
    try
    {
      int port = ((IPEndPoint)listener.LocalEndpoint).Port;
      string host = Environment.ProcessPath
        ?? throw new InvalidOperationException("The current .NET host is required.");
      string assembly = typeof(BootstrapOptions).Assembly.Location;
      var start = new ProcessStartInfo(host)
      {
        UseShellExecute = false,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        WorkingDirectory = Path.GetDirectoryName(assembly)
          ?? throw new InvalidOperationException("Bootstrap assembly directory is required."),
      };
      start.ArgumentList.Add(assembly);
      start.ArgumentList.Add("--ensure-storage-only");
      start.Environment["DOTNET_ENVIRONMENT"] = "Development";
      start.Environment["ASPNETCORE_ENVIRONMENT"] = "Development";
      start.Environment["INFRA"] = "local";
      start.Environment.Remove("AZURE_CLIENT_ID");
      start.Environment.Remove("ConnectionStrings__primary");
      string connection = $"DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;"
        + $"AccountKey={Convert.ToBase64String(new byte[32])};"
        + $"BlobEndpoint=http://127.0.0.1:{port}/devstoreaccount1;"
        + $"QueueEndpoint=http://127.0.0.1:{port}/devstoreaccount1;";
      start.Environment["ConnectionStrings__blobs"] = connection;
      start.Environment["ConnectionStrings__queues"] = connection;
      child = Process.Start(start) ?? throw new InvalidOperationException("Bootstrap child did not start.");
      Task<string> output = child.StandardOutput.ReadToEndAsync(timeout.Token);
      Task<string> errors = child.StandardError.ReadToEndAsync(timeout.Token);

      using TcpClient request = await listener.AcceptTcpClientAsync(timeout.Token);
      using var reader = new StreamReader(request.GetStream());
      string? firstLine = await reader.ReadLineAsync(timeout.Token);
      Assert.IsNotNull(firstLine);
      StringAssert.StartsWith(firstLine, "PUT /devstoreaccount1/invoices?");
      StringAssert.Contains(firstLine, "restype=container");
      while (!string.IsNullOrEmpty(await reader.ReadLineAsync(timeout.Token))) { }

      // Keep the synthetic response pending so SIGTERM must cancel the real SDK await.
      await SendSigtermAsync(child.Id, timeout.Token);
      await child.WaitForExitAsync(timeout.Token);
      string error = await errors;
      await output;

      Assert.AreEqual(1, child.ExitCode);
      StringAssert.Contains(error, "Local development bootstrap cancelled;");
      Assert.IsFalse(error.Contains("Local development bootstrap failed:", StringComparison.Ordinal));
      Assert.IsFalse(listener.Pending(), "No queue creation or later storage phase may follow cancellation.");
    }
    finally
    {
      listener.Stop();
      if (child is not null)
      {
        if (!child.HasExited) { child.Kill(entireProcessTree: true); await child.WaitForExitAsync(); }
        child.Dispose();
      }
    }
  }

  /// <summary>Verifies the signal sender produces native termination when no handler exists.</summary>
  [TestMethod]
  [UnsupportedOSPlatform("windows")]
  public async Task Sigterm_UnhandledControlProcess_UsesNativeTerminationInsteadOfCooperativeExit()
  {
    if (OperatingSystem.IsWindows()) { Assert.Inconclusive("SIGTERM requires a Unix process runtime."); }
    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
    var start = new ProcessStartInfo("/bin/sh")
    {
      UseShellExecute = false,
      RedirectStandardOutput = true,
      RedirectStandardError = true,
    };
    start.ArgumentList.Add("-c");
    start.ArgumentList.Add("printf 'ready\\n'; exec sleep 30");
    using Process child = Process.Start(start)
      ?? throw new InvalidOperationException("Signal control child did not start.");
    try
    {
      Assert.AreEqual("ready", await child.StandardOutput.ReadLineAsync(timeout.Token));
      await SendSigtermAsync(child.Id, timeout.Token);
      await child.WaitForExitAsync(timeout.Token);
      Assert.AreEqual(143, child.ExitCode);
    }
    finally
    {
      if (!child.HasExited) { child.Kill(entireProcessTree: true); await child.WaitForExitAsync(); }
    }
  }

  private static async Task SendSigtermAsync(int processId, CancellationToken cancellationToken)
  {
    var start = new ProcessStartInfo("kill") { UseShellExecute = false };
    start.ArgumentList.Add("-TERM");
    start.ArgumentList.Add(processId.ToString(CultureInfo.InvariantCulture));
    using Process signal = Process.Start(start)
      ?? throw new InvalidOperationException("SIGTERM sender did not start.");
    await signal.WaitForExitAsync(cancellationToken);
    Assert.AreEqual(0, signal.ExitCode);
  }
}
