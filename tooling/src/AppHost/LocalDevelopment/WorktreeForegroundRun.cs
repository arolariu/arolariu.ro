namespace AppHost.LocalDevelopment;

using System.Reflection;
using System.Text.Json;
using AppHost.Applications.Website;
using AppHost.Repository;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

/// <summary>Runs a validated scoped graph until its owning controller closes the standard-input pipe.</summary>
internal static class WorktreeForegroundRun
{
  private static readonly string[] RequiredResources =
    ["website", "api", "exp", "local-identities", "cv", "docs", "status", "cosmos", "mssql", "storage", "redis"];
  private static readonly TimeSpan ShutdownTimeout = TimeSpan.FromSeconds(90);

  internal static async Task RunAsync(string descriptorPath)
  {
    if (!OperatingSystem.IsWindows() || !Console.IsInputRedirected)
      throw new InvalidOperationException(WorktreeLaunchScope.LaunchBlocked);

    using var startup = new CancellationTokenSource(TimeSpan.FromMinutes(5));
    WorktreeLaunchRequest request = await ReadRequestAsync(Console.In, startup.Token).ConfigureAwait(false);
    Console.WriteLine("worktree-phase:request");
    string registry = WorktreeRegistry.OpenWindows(create: false)
      ?? throw new InvalidOperationException(WorktreeLaunchScope.LaunchBlocked);
    string? project = typeof(WorktreeForegroundRun).Assembly.GetCustomAttributes<AssemblyMetadataAttribute>()
      .SingleOrDefault(attribute => attribute.Key == "apphostprojectpath")?.Value;
    string? revision = typeof(WorktreeForegroundRun).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?
      .InformationalVersion.Split('+').LastOrDefault();
    if (project is null || revision != request.Head)
      throw new InvalidOperationException("The scoped AppHost build does not match the selected revision.");
    string projectDirectory = Directory.Exists(project) ? project : Path.GetDirectoryName(project)
      ?? throw new InvalidOperationException("The scoped build does not identify its checkout.");
    RepositoryLayout layout = RepositoryLayout.Resolve(projectDirectory);
    if (!string.Equals(layout.RootDirectory, request.Root, StringComparison.OrdinalIgnoreCase))
      throw new InvalidOperationException("The scoped AppHost build belongs to a different checkout.");
    Console.WriteLine("worktree-phase:build-verified");

    string runtimeDirectory = Path.Combine(Path.GetDirectoryName(descriptorPath)
      ?? throw new InvalidOperationException("Missing scoped stage."), "runtime");
    string exp = Path.Combine(runtimeDirectory, "exp.json");
    string python = Path.Combine(layout.ExpDirectory, ".venv", "Scripts", "python.exe");
    if (!File.Exists(python) || !Path.IsPathFullyQualified(request.NodeExecutable) || !File.Exists(request.NodeExecutable))
      throw new InvalidOperationException("The prepared checkout interpreters are unavailable.");

    IConfigurationRoot userSecrets = new ConfigurationBuilder()
      .SetBasePath(projectDirectory)
      .AddJsonFile("appsettings.json", optional: true)
      .AddJsonFile("appsettings.Development.json", optional: true)
      .AddUserSecrets(typeof(WorktreeForegroundRun).Assembly, optional: true)
      .AddEnvironmentVariables().Build();
    string sql = userSecrets["Parameters:sql-password"] ?? "";
    string redis = userSecrets["Parameters:redis-password"] ?? "";
    if (string.IsNullOrWhiteSpace(sql) || string.IsNullOrWhiteSpace(redis))
      throw new InvalidOperationException("The local SQL and Redis parameters are required.");
    Console.WriteLine("worktree-phase:inputs-verified");
    var runtime = new WorktreeRuntimeInputs(exp, Path.Combine(runtimeDirectory, "website.pem"), Path.Combine(runtimeDirectory, "website-key.pem"),
      Path.Combine(runtimeDirectory, "service.pem"), Path.Combine(runtimeDirectory, "service-key.pem"), python, request.NodeExecutable,
      endpoints => WorktreeRuntimePreparation.VerifyExpConfig(exp, endpoints), () => sql, () => redis);
    var scope = WorktreeStageVerifier.LoadPending(registry, descriptorPath, request.ScopeId, layout.RootDirectory,
      request.CommonGitDirectory, request.Branch, request.Head, request.Engine, request.EnginePin, request.Volumes, runtime);
    Console.WriteLine("worktree-phase:lease-verified");
    using var authority = WebsiteCertificateRenewal.LoadAuthority(WebsiteCertificateRenewal.ResolveAuthorityDirectory())
      ?? throw new InvalidOperationException("The trusted local certificate authority is unavailable.");
    WorktreeRuntimePreparation.Write(scope, layout, authority, DateTimeOffset.UtcNow);
    Console.WriteLine("worktree-phase:prepared");

    // The pipe remains open for the foreground owner's lifetime. Do not start after it is abandoned.
    Task<string?> owner = Task.Run(Console.In.ReadLine);
    if (owner.IsCompleted) throw new InvalidOperationException("The scoped launch controller has disconnected.");
    var builder = DistributedApplication.CreateBuilder(new DistributedApplicationOptions { Args = [], ProjectDirectory = projectDirectory });
    builder.Services.AddLogging(logging => logging.ClearProviders());
    // Keep the generic host from cancelling while DCP waits for scoped container cleanup.
    builder.Services.Configure<HostOptions>(options => options.ShutdownTimeout = ShutdownTimeout);
    builder.Configuration["DcpPublisher:ContainerRuntime"] = request.Engine == "rancher" ? "docker" : "podman";
    builder.Configuration["DcpPublisher:WaitForResourceCleanup"] = "true";
    builder.Configuration["DcpPublisher:ResourceNameSuffix"] = scope.RunId[..12];
    scope.AuthorizeDispatch();
    LocalApplication.Compose(builder, layout, sql, scope);
    await using var app = builder.Build();
    using var readiness = CancellationTokenSource.CreateLinkedTokenSource(startup.Token);
    Task report = ReportStatesAsync(app.ResourceNotifications, readiness.Token);
    Task trace = ReportWebsiteAsync(app.Services.GetRequiredService<ResourceLoggerService>(), readiness.Token);
    try
    {
      Task launch = app.StartAsync(startup.Token);
      if (await Task.WhenAny(launch, owner).ConfigureAwait(false) == owner)
        await startup.CancelAsync().ConfigureAwait(false);
      await launch.ConfigureAwait(false);
      Console.WriteLine("worktree-phase:started");

      Task health = Task.WhenAll(RequiredResources
        .Select(name => app.ResourceNotifications.WaitForResourceHealthyAsync(name, WaitBehavior.StopOnResourceUnavailable, startup.Token)));
      if (await Task.WhenAny(health, owner).ConfigureAwait(false) != owner)
      {
        await health.ConfigureAwait(false);
        Console.WriteLine("worktree-website-healthy");
        await startup.CancelAsync().ConfigureAwait(false);
        await owner.ConfigureAwait(false);
      }
    }
    finally
    {
      await readiness.CancelAsync().ConfigureAwait(false);
      await report.ConfigureAwait(false);
      await trace.ConfigureAwait(false);
      using var shutdown = new CancellationTokenSource(ShutdownTimeout);
      await app.StopAsync(shutdown.Token).ConfigureAwait(false);
    }
  }

  private static async Task ReportWebsiteAsync(ResourceLoggerService logs, CancellationToken token)
  {
    try
    {
      await foreach (var batch in logs.WatchAsync("website").WithCancellation(token).ConfigureAwait(false))
      {
        foreach (LogLine line in batch)
        {
          string text = line.Content;
          string? message = text.Contains("Module not found", StringComparison.OrdinalIgnoreCase) ? "module-not-found"
            : text.Contains("certificate", StringComparison.OrdinalIgnoreCase) ? "certificate-error"
            : text.Contains("Clerk", StringComparison.OrdinalIgnoreCase) ? "clerk"
            : text.Contains("TypeError", StringComparison.OrdinalIgnoreCase) ? "type-error"
            : text.Contains("config", StringComparison.OrdinalIgnoreCase) && text.Contains("Error", StringComparison.OrdinalIgnoreCase) ? "config-error"
            : text.Contains("Error", StringComparison.OrdinalIgnoreCase) ? "other-error" : null;
          if (message is not null) Console.WriteLine($"worktree-phase:website-{message}");
        }
      }
    }
    catch (OperationCanceledException) when (token.IsCancellationRequested) { }
  }

  private static async Task ReportStatesAsync(ResourceNotificationService notifications, CancellationToken token)
  {
    try
    {
      using var timer = new PeriodicTimer(TimeSpan.FromSeconds(25));
      while (await timer.WaitForNextTickAsync(token).ConfigureAwait(false))
      {
        foreach (string name in RequiredResources)
        {
          if (!notifications.TryGetCurrentState(name, out ResourceEvent? resource)) continue;
          string state = resource.Snapshot.State?.Text ?? "Unknown";
          if (!state.All(char.IsAsciiLetterOrDigit) || state.Length > 24) state = "Other";
          Console.WriteLine($"worktree-phase:{name}-{state}-{resource.Snapshot.HealthStatus}");
        }
      }
    }
    catch (OperationCanceledException) when (token.IsCancellationRequested) { }
  }

  private static async Task<WorktreeLaunchRequest> ReadRequestAsync(TextReader input, CancellationToken token)
  {
    char[] buffer = new char[1];
    var request = new System.Text.StringBuilder();
    while (request.Length < 16 * 1024 && await input.ReadAsync(buffer.AsMemory(), token).ConfigureAwait(false) == 1)
    {
      if (buffer[0] == '\n')
        return JsonSerializer.Deserialize<WorktreeLaunchRequest>(request.ToString())
          ?? throw new InvalidOperationException("Missing scoped launch request.");
      request.Append(buffer[0]);
    }
    throw new InvalidOperationException("Invalid scoped launch request.");
  }
}
