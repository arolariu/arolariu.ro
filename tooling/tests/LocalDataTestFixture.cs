namespace LocalDevelopment.Tests;

using System.Diagnostics;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Refuses emulator integration tests unless every target belongs to the explicitly selected fixture.</summary>
internal static class LocalDataTestFixture
{
  internal const string CosmosKey =
    "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";
  internal const string StorageKey =
    "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";
  internal static string CosmosConnectionString =>
    $"AccountEndpoint=http://127.0.0.1:18083/;AccountKey={CosmosKey}";
  internal static string StorageConnectionString =>
    $"DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey={StorageKey};"
    + "BlobEndpoint=http://127.0.0.1:19000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:19001/devstoreaccount1;"
    + "TableEndpoint=http://127.0.0.1:19002/devstoreaccount1;";

  internal static async Task VerifyAsync(params (string Service, string ContainerPort, string HostPort)[] bindings)
  {
    if (Environment.GetEnvironmentVariable("AROLARIU_RUN_LOCAL_DATA_TESTS") != "1")
    {
      Assert.Inconclusive("Isolated emulator tests require explicit AROLARIU_RUN_LOCAL_DATA_TESTS=1.");
    }
    string scope = Environment.GetEnvironmentVariable("AROLARIU_LOCAL_DATA_TEST_SCOPE") ?? string.Empty;
    Assert.IsTrue(scope.StartsWith("arolariu-seed-tests-", StringComparison.Ordinal));
    string engine = Environment.GetEnvironmentVariable("AROLARIU_CONTAINER_ENGINE") ?? string.Empty;
    Assert.IsTrue(engine is "rancher" or "podman");
    string[] services = bindings.Select(binding => binding.Service).Distinct(StringComparer.Ordinal).ToArray();
    var start = new ProcessStartInfo(engine == "rancher" ? "docker" : "podman")
    {
      RedirectStandardOutput = true,
      RedirectStandardError = true,
      UseShellExecute = false,
    };
    start.ArgumentList.Add("inspect");
    foreach (string service in services) { start.ArgumentList.Add($"{scope}-{service}"); }
    using Process process = Process.Start(start) ?? throw new InvalidOperationException("Cannot inspect isolated emulators.");
    Task<string> output = process.StandardOutput.ReadToEndAsync();
    Task<string> errors = process.StandardError.ReadToEndAsync();
    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
    try { await process.WaitForExitAsync(timeout.Token); }
    catch
    {
      if (!process.HasExited) { process.Kill(entireProcessTree: true); }
      await process.WaitForExitAsync();
      await Task.WhenAll(output, errors);
      throw;
    }
    await Task.WhenAll(output, errors);
    Assert.AreEqual(0, process.ExitCode, "The explicitly scoped test containers must exist.");
    using JsonDocument inspection = JsonDocument.Parse(await output);
    Assert.AreEqual(services.Length, inspection.RootElement.GetArrayLength());
    foreach (JsonElement container in inspection.RootElement.EnumerateArray())
    {
      Assert.IsTrue(container.GetProperty("State").GetProperty("Running").GetBoolean());
      Assert.AreEqual(scope, container.GetProperty("Config").GetProperty("Labels")
        .GetProperty("com.docker.compose.project").GetString());
      JsonElement mounts = container.GetProperty("Mounts");
      Assert.IsTrue(mounts.GetArrayLength() > 0);
      foreach (JsonElement mount in mounts.EnumerateArray())
      {
        Assert.AreEqual("volume", mount.GetProperty("Type").GetString());
        Assert.IsTrue(mount.GetProperty("Name").GetString()?.StartsWith($"{scope}-", StringComparison.Ordinal) == true);
      }
      foreach (var binding in bindings.Where(binding =>
        container.GetProperty("Name").GetString() == $"/{scope}-{binding.Service}"))
      {
        JsonElement ports = container.GetProperty("NetworkSettings").GetProperty("Ports").GetProperty(binding.ContainerPort);
        Assert.AreEqual(1, ports.GetArrayLength());
        Assert.AreEqual("127.0.0.1", ports[0].GetProperty("HostIp").GetString());
        Assert.AreEqual(binding.HostPort, ports[0].GetProperty("HostPort").GetString());
      }
    }
  }
}
