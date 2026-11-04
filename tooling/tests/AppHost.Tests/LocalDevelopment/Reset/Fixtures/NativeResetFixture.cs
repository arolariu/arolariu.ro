namespace AppHost.Tests.LocalDevelopment.Reset.Fixtures;

using System.Data.Common;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using global::AppHost.Applications;
using global::AppHost.Infrastructure;
using global::AppHost.LocalDevelopment;
using global::AppHost.LocalDevelopment.Reset;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Starts the production composition against test-only volumes and controlled serving processes.</summary>
internal sealed class NativeResetFixture : IAsyncDisposable
{
  private readonly DistributedApplication application;
  private readonly string identityConfigPath;
  internal LocalDataResetResources Resources { get; }
  internal FixtureInteraction Confirmation { get; }
  internal ResourceCommandService Commands => application.Services.GetRequiredService<ResourceCommandService>();
  internal ResourceNotificationService Notifications => application.Services.GetRequiredService<ResourceNotificationService>();

  private NativeResetFixture(DistributedApplication application, LocalDataResetResources resources, FixtureInteraction confirmation,
    string identityConfigPath)
  {
    this.application = application;
    Resources = resources;
    Confirmation = confirmation;
    this.identityConfigPath = identityConfigPath;
  }

  internal static async Task<NativeResetFixture> StartAsync(string scope, string password, CancellationToken token,
    BootstrapConnectionGate? bootstrapGate = null, string? websiteHealthFile = null, bool waitForApplications = true)
  {
    Stopwatch elapsed = Stopwatch.StartNew();
    RequireAvailablePorts(8081, 8082, 10000, 10001);
    await RequireTrustedCertificateAsync(token);
    await RequireCachedImagesAsync(token);
    string hostDirectory = Path.GetFullPath(Path.Combine(
      Path.GetDirectoryName(new Projects.LocalDevelopment_Bootstrap().ProjectPath)
        ?? throw new InvalidOperationException(), "..", "AppHost"));
    var builder = DistributedApplication.CreateBuilder(new DistributedApplicationOptions
    {
      AssemblyName = typeof(InfrastructureResources).Assembly.GetName().Name,
      ProjectDirectory = hostDirectory,
      DisableDashboard = true,
      Args = [],
    });
    builder.Environment.EnvironmentName = "Development";
    builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
    {
      ["Parameters:sql-password"] = password,
      ["Parameters:redis-password"] = password,
      ["DcpPublisher:ContainerRuntime"] = Environment.GetEnvironmentVariable("AROLARIU_CONTAINER_ENGINE") == "podman" ? "podman" : "docker",
      ["DcpPublisher:WaitForResourceCleanup"] = "true",
    });
    LocalInfrastructure infrastructure = builder.AddInfrastructure(password);
    builder.Resources.Remove(builder.Resources.Single(resource => resource.Name == "redis"));
    var volumes = new LocalDataResetVolumeNames($"{scope}-cosmos", $"{scope}-storage", $"{scope}-sql");
    ReplaceVolume(infrastructure.Cosmos.Resource, volumes.Cosmos);
    ReplaceVolume(infrastructure.Storage.Resource, volumes.Storage);
    ReplaceVolume(infrastructure.SqlDatabase.Resource.Parent, volumes.Sql);
    string seedDirectory = Path.Combine(AppContext.BaseDirectory, "SeedData");
    var bootstrap = builder.AddProject<Projects.LocalDevelopment_Bootstrap>("local-bootstrap")
      .WithReference(infrastructure.CosmosDatabase)
      .WithReference(infrastructure.Blobs)
      .WithReference(infrastructure.Queues)
      .WithEnvironment("DOTNET_ENVIRONMENT", "Development")
      .WithEnvironment("INFRA", "local")
      .WithEnvironment("SEED_DATA_DIRECTORY", seedDirectory)
      .WaitFor(infrastructure.CosmosInvoices).WaitFor(infrastructure.CosmosMerchants)
      .WaitFor(infrastructure.Blobs).WaitFor(infrastructure.Queues).ExcludeFromManifest();
    if (bootstrapGate is not null)
    {
      bootstrap.WithEnvironment(async context =>
      {
        IResourceWithConnectionString nativeConnection = infrastructure.CosmosDatabase.Resource;
        string connection = await nativeConnection.GetConnectionStringAsync(context.CancellationToken)
          ?? throw new InvalidOperationException("The native Bootstrap connection is unavailable.");
        context.EnvironmentVariables["ConnectionStrings__primary"] = bootstrapGate.Redirect(connection);
      });
    }
    string server = Path.Combine(AppContext.BaseDirectory, "Fixtures", "healthy-process.py");
    var exp = builder.AddExecutable("exp", "python", AppContext.BaseDirectory, "-u", server)
      .WithHttpEndpoint(port: FreePort(), env: "PORT", isProxied: false).WithHttpHealthCheck("/health")
      .WaitForCompletion(bootstrap);
    string identityConfig = Path.Combine(Path.GetTempPath(), $"{scope}.identity.json");
    await File.WriteAllTextAsync(identityConfig, JsonSerializer.Serialize(new Dictionary<string, string>
    {
      ["Auth:JWT:Issuer"] = "https://local-fixture.invalid",
      ["Auth:JWT:Audience"] = "https://local-fixture-api.invalid",
      ["Auth:JWT:Secret"] = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)),
    }), token);
    var identity = builder.AddProject<Projects.LocalDevelopment_Identity>("local-identities", launchProfileName: null)
      .WithHttpEndpoint(port: FreePort(), name: "http", isProxied: false)
      .WithEnvironment("DOTNET_ENVIRONMENT", "Development")
      .WithEnvironment("INFRA", "local")
      .WithEnvironment("LOCAL_CONFIG_PATH", identityConfig)
      .WithEnvironment("LOCAL_SWAGGER_ORIGIN", "http://localhost:5000")
      .WithHttpHealthCheck("/health").WaitFor(exp);
    var api = builder.AddExecutable("api", "python", AppContext.BaseDirectory, "-u", server)
      .WithHttpEndpoint(port: FreePort(), env: "PORT", isProxied: false).WithHttpHealthCheck("/health")
      .WaitForCompletion(bootstrap).WaitFor(exp).WaitFor(identity);
    var website = builder.AddExecutable("website", "python", AppContext.BaseDirectory, "-u", server)
      .WithEnvironment("HEALTH_GATE_FILE", websiteHealthFile ?? string.Empty)
      .WithHttpEndpoint(port: FreePort(), env: "PORT", isProxied: false).WithHttpHealthCheck("/health")
      .WaitFor(api);
    var resources = new LocalDataResetResources(infrastructure, new LocalResources(bootstrap, identity),
      new LocalApplicationResources(api.Resource, website.Resource, exp.Resource), volumes);
    LocalDataResetSafety.ValidateResourceOwnership(resources, isDevelopment: true, isRunMode: true);
    foreach (string volume in new[] { volumes.Cosmos, volumes.Storage, volumes.Sql })
    {
      Assert.IsTrue(volume.StartsWith($"{scope}-", StringComparison.Ordinal));
      Assert.IsFalse(volume.StartsWith("arolariu-selfhost-", StringComparison.Ordinal));
    }
    IInteractionService interaction = DispatchProxy.Create<IInteractionService, FixtureInteraction>();
    var confirmation = (FixtureInteraction)interaction;
    builder.Services.AddSingleton(interaction);
    builder.AddLocalDataReset(resources);
    DistributedApplication app;
    try { app = builder.Build(); }
    catch { File.Delete(identityConfig); throw; }
    var fixture = new NativeResetFixture(app, resources, confirmation, identityConfig);
    try
    {
      using var startup = CancellationTokenSource.CreateLinkedTokenSource(token);
      startup.CancelAfter(TimeSpan.FromSeconds(120));
      await app.StartAsync(startup.Token);
      if (waitForApplications)
      {
        await fixture.Notifications.WaitForResourceHealthyAsync("website", WaitBehavior.StopOnResourceUnavailable, startup.Token);
      }
      else
      {
        await fixture.Notifications.WaitForResourceAsync("local-bootstrap", change =>
          change.Snapshot.State?.Text == KnownResourceStates.Exited
          || change.Snapshot.State?.Text == KnownResourceStates.Finished
          || change.Snapshot.State?.Text == KnownResourceStates.FailedToStart, startup.Token);
      }
      Console.WriteLine($"Native fixture startup: {elapsed.Elapsed}; waitForApplications={waitForApplications}.");
      return fixture;
    }
    catch
    {
      foreach (IResource resource in builder.Resources)
      {
        string state = fixture.Notifications.TryGetCurrentState(resource.Name, out ResourceEvent? change)
          ? $"{change.Snapshot.State?.Text}; health={change.Snapshot.HealthStatus}" : "no snapshot";
        resource.TryGetContainerImageName(out string? image);
        Console.WriteLine($"Fixture resource {resource.Name}: {state}; image={image}");
      }
      foreach (IResource target in new[] { infrastructure.Storage.Resource, (IResource)bootstrap.Resource, api.Resource, website.Resource })
      {
        var resourceLogs = new List<LogLine>();
        await foreach (var batch in app.Services.GetRequiredService<ResourceLoggerService>().GetAllAsync(target))
        {
          resourceLogs.AddRange(batch);
        }
        foreach (LogLine line in resourceLogs.TakeLast(15)) { Console.WriteLine($"Fixture {target.Name} log: {line.Content}"); }
      }
      await fixture.DisposeAsync();
      throw;
    }
  }

  internal async Task<string> ConnectionAsync(IResourceWithConnectionString resource, CancellationToken token) =>
    await resource.GetConnectionStringAsync(token) ?? throw new InvalidOperationException("Fixture connection unavailable.");

  internal async Task<DbConnection> SqlAsync(CancellationToken token)
  {
    string connection = await ConnectionAsync(Resources.Infrastructure.SqlDatabase.Resource, token);
    var client = new SqlConnection(connection);
    try { await client.OpenAsync(token); return client; }
    catch { await client.DisposeAsync(); throw; }
  }

  public async ValueTask DisposeAsync()
  {
    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(60));
    try { await application.StopAsync(timeout.Token); }
    finally
    {
      try { await application.DisposeAsync(); }
      finally { File.Delete(identityConfigPath); }
    }
  }

  internal static async Task DeleteVolumesAsync(string scope)
  {
    Assert.IsTrue(scope.StartsWith("arolariu-seed-tests-", StringComparison.Ordinal));
    string engine = Environment.GetEnvironmentVariable("AROLARIU_CONTAINER_ENGINE") ?? string.Empty;
    Assert.IsTrue(engine is "rancher" or "podman");
    var start = new ProcessStartInfo(engine == "rancher" ? "docker" : "podman")
    {
      UseShellExecute = false,
      RedirectStandardOutput = true,
      RedirectStandardError = true,
    };
    start.ArgumentList.Add("volume");
    start.ArgumentList.Add("rm");
    foreach (string service in new[] { "cosmos", "storage", "sql" }) { start.ArgumentList.Add($"{scope}-{service}"); }
    using Process process = Process.Start(start) ?? throw new InvalidOperationException("Cannot clean up fixture volumes.");
    Task<string> output = process.StandardOutput.ReadToEndAsync();
    Task<string> errors = process.StandardError.ReadToEndAsync();
    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
    await process.WaitForExitAsync(timeout.Token);
    await Task.WhenAll(output, errors);
    if (process.ExitCode != 0)
    {
      string[] failures = (await errors).Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
      Assert.IsTrue(failures.Length > 0 && failures.All(message =>
        message.Contains("no such volume", StringComparison.OrdinalIgnoreCase)),
        "The test-owned volumes must be removed after the native host stops.");
    }
  }

  private static void ReplaceVolume(IResource resource, string name)
  {
    ContainerMountAnnotation previous = resource.Annotations.OfType<ContainerMountAnnotation>().Single();
    resource.Annotations.Remove(previous);
    resource.Annotations.Add(new ContainerMountAnnotation(name, previous.Target, ContainerMountType.Volume, isReadOnly: false));
  }

  private static int FreePort()
  {
    using var listener = new TcpListener(IPAddress.Loopback, 0);
    listener.Start();
    return ((IPEndPoint)listener.LocalEndpoint).Port;
  }

  private static void RequireAvailablePorts(params int[] ports)
  {
    foreach (int port in ports)
    {
      try
      {
        using var listener = new TcpListener(IPAddress.Loopback, port);
        listener.Start();
      }
      catch (SocketException)
      {
        Assert.Inconclusive("Native isolated tests require unoccupied standard service ports; no existing listener is stopped.");
      }
    }
  }

  private static async Task RequireTrustedCertificateAsync(CancellationToken token)
  {
    var start = new ProcessStartInfo("dotnet")
    {
      UseShellExecute = false,
      RedirectStandardOutput = true,
      RedirectStandardError = true,
    };
    foreach (string argument in new[] { "dev-certs", "https", "--check", "--trust" }) { start.ArgumentList.Add(argument); }
    using Process process = Process.Start(start) ?? throw new InvalidOperationException("Cannot check existing certificate trust.");
    Task<string> output = process.StandardOutput.ReadToEndAsync(token);
    Task<string> errors = process.StandardError.ReadToEndAsync(token);
    await process.WaitForExitAsync(token);
    await Task.WhenAll(output, errors);
    if (process.ExitCode != 0)
    {
      Assert.Inconclusive("Native Cosmos tests require an already trusted development certificate; this test never installs trust.");
    }
  }

  private static async Task RequireCachedImagesAsync(CancellationToken token)
  {
    string engine = Environment.GetEnvironmentVariable("AROLARIU_CONTAINER_ENGINE") ?? string.Empty;
    Assert.IsTrue(engine is "rancher" or "podman");
    var start = new ProcessStartInfo(engine == "rancher" ? "docker" : "podman")
    {
      UseShellExecute = false,
      RedirectStandardOutput = true,
      RedirectStandardError = true,
    };
    start.ArgumentList.Add("image");
    start.ArgumentList.Add("inspect");
    start.ArgumentList.Add($"mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator@sha256:{Constants.CosmosEmulatorImageSha256}");
    start.ArgumentList.Add($"mcr.microsoft.com/azure-storage/azurite@sha256:{Constants.AzuriteEmulatorImageSha256}");
    start.ArgumentList.Add($"mcr.microsoft.com/mssql/server@sha256:{Constants.SqlServerImageSha256}");
    start.ArgumentList.Add("--format");
    start.ArgumentList.Add("{{.Id}}");
    using Process process = Process.Start(start) ?? throw new InvalidOperationException("Cannot check fixture image availability.");
    Task<string> output = process.StandardOutput.ReadToEndAsync(token);
    Task<string> errors = process.StandardError.ReadToEndAsync(token);
    await process.WaitForExitAsync(token);
    await Task.WhenAll(output, errors);
    if (process.ExitCode != 0)
    {
      Assert.Inconclusive("Native integration requires the three reviewed cached images; this test does not pull missing dependencies.");
    }
  }
}

/// <summary>Represents only the external dashboard confirmation boundary for this isolated test host.</summary>
public class FixtureInteraction : DispatchProxy
{
  internal bool Approved { get; set; }
  internal int Prompts { get; private set; }

  /// <inheritdoc />
  protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
  {
    if (targetMethod?.Name == "get_IsAvailable") { return true; }
    if (targetMethod?.Name == nameof(IInteractionService.PromptConfirmationAsync))
    {
      Prompts++;
      return Task.FromResult(InteractionResult.Ok(Approved));
    }
    throw new NotSupportedException("The isolated reset fixture supports confirmation only.");
  }
}
