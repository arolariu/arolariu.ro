namespace AppHost.LocalDevelopment;

using System.Collections.ObjectModel;
using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;

/// <summary>Prepared runtime references; never supplied by descriptor JSON, a launch profile or user secrets.</summary>
internal sealed record WorktreeRuntimeInputs(
  string ExpConfigPath,
  string? WebsiteCertificatePath,
  string WebsiteKeyPath,
  string ServiceCertificatePath,
  string ServiceKeyPath,
  string PythonExecutable,
  string NodeExecutable,
  Func<IReadOnlyDictionary<string, string>, bool> VerifyExpConfig,
  Func<string> ReadSqlPassword,
  Func<string> ReadRedisPassword);

/// <summary>
/// Receipt from an internal supervisor boundary, not a receipt that can be loaded from an arbitrary file.
/// The verifier must attest the canonical, protected registry route, current pending lease, checkout
/// revision, build provenance, pinned local engine, and exact descriptor bytes read from that run. It must positively verify storage
/// ownership on that engine, not merely repeat its proposed names. Runtime evidence must attest
/// existing prepared dependencies, validated scope-owned exp input (including the derived endpoints),
/// matching private keys, exact browser SAN and trusted IPv4 service certificate paths. It must
/// reject reparse/hard links, missing files, foreign runtime inputs, and stale or replaced evidence.
/// No production verifier exists yet.
/// </summary>
internal sealed record VerifiedWorktreeStage(
  ReadOnlyMemory<byte> Descriptor,
  int LeaseVersion,
  string RegistryDirectory,
  string Root,
  string ScopeId,
  string RunId,
  string Branch,
  string Head,
  string Engine,
  string EnginePin,
  IReadOnlyDictionary<string, int> LeasePorts,
  IReadOnlyDictionary<string, string>? OwnedVolumes,
  WorktreeRuntimeInputs? Runtime);

/// <summary>A validated scoped graph input. Not permission to start processes or mount volumes.</summary>
internal sealed class WorktreeLaunchScope
{
  internal const string DescriptorEnvironmentVariable = "AROLARIU_WORKTREE_DESCRIPTOR";
  internal const string RunArgument = "--run-verified-worktree";
  internal const string LaunchBlocked = "Scoped AppHost execution requires a verified native launch adapter.";
  internal const string LoopbackHost = "127.0.0.1";
  internal const int LaunchVersion = 4;

  private static readonly string[] DescriptorKeys =
    ["version", "root", "scopeId", "runId", "branch", "head", "engine", "mode", "loopbackHost", "ports", "volumes", "websiteOrigin"];

  private static readonly string[] PortNames =
  [
    "dashboardHttps", "dashboardHttp", "dashboardOtlpGrpc", "dashboardOtlpHttp", "resourceService",
    "website", "api", "exp", "cv", "docs", "status", "localIdentity", "sql", "cosmos",
    "cosmosDataExplorer", "cosmosReadiness", "azuriteBlob", "azuriteQueue", "azuriteTable", "redis",
  ];

  private static readonly string[] TelemetrySignals = ["TRACES", "METRICS", "LOGS"];

  private WorktreeLaunchScope(VerifiedWorktreeStage stage, Dictionary<string, int> ports,
    Dictionary<string, string> volumes, string websiteOrigin)
  {
    Root = stage.Root;
    ScopeId = stage.ScopeId;
    RunId = stage.RunId;
    Ports = new ReadOnlyDictionary<string, int>(ports);
    Volumes = new ReadOnlyDictionary<string, string>(volumes);
    WebsiteOrigin = websiteOrigin;
    Runtime = stage.Runtime!;
  }

  internal string Root { get; }
  internal string ScopeId { get; }
  internal string RunId { get; }
  internal IReadOnlyDictionary<string, int> Ports { get; }
  internal IReadOnlyDictionary<string, string> Volumes { get; }
  internal string WebsiteOrigin { get; }
  internal WorktreeRuntimeInputs Runtime { get; }
  private bool DispatchAuthorized { get; set; }

  internal void AuthorizeDispatch() => DispatchAuthorized = true;

  /// <summary>Direct startup has no verifier. Never open a caller-supplied file or fall back to the legacy graph.</summary>
  internal static WorktreeLaunchScope Load(string descriptorPath, string expectedWorktreeRoot) =>
    Load(descriptorPath, expectedWorktreeRoot, static (_, _) => null);

  internal static WorktreeLaunchScope Load(string descriptorPath, string expectedWorktreeRoot,
    Func<string, string, VerifiedWorktreeStage?> verify)
  {
    ArgumentNullException.ThrowIfNull(verify);
    VerifiedWorktreeStage stage = verify(descriptorPath, expectedWorktreeRoot) ?? throw new InvalidOperationException(LaunchBlocked);
    Ensure(stage.LeaseVersion == LaunchVersion && stage.Engine is ("podman" or "rancher") && IsLowerHex(stage.EnginePin, 64)
      && IsLowerHex(stage.ScopeId, 32) && IsLowerHex(stage.RunId, 32)
      && stage.Branch.Length is > 0 and <= 1024 && !stage.Branch.Any(char.IsControl)
      && (IsLowerHex(stage.Head, 40) || IsLowerHex(stage.Head, 64)));
    Ensure(SameCanonicalPath(expectedWorktreeRoot, stage.Root) && IsCanonicalPath(stage.RegistryDirectory));
    string runDirectory = Path.Combine(stage.RegistryDirectory, stage.ScopeId, stage.RunId);
    Ensure(SameCanonicalPath(descriptorPath, Path.Combine(runDirectory, "descriptor.json")));
    VerifyRuntimePaths(stage.Runtime, Path.Combine(runDirectory, "runtime"), stage.Root);
    Ensure(stage.Descriptor.Length is > 0 and <= 64 * 1024);

    try
    {
      using JsonDocument document = JsonDocument.Parse(stage.Descriptor);
      JsonElement descriptor = document.RootElement;
      Ensure(HasKeys(descriptor, DescriptorKeys));
      Ensure(descriptor.GetProperty("version").GetInt32() == LaunchVersion
        && SameCanonicalPath(descriptor.GetProperty("root").GetString(), stage.Root)
        && descriptor.GetProperty("mode").GetString() == "aspire"
        && descriptor.GetProperty("engine").GetString() == stage.Engine
        && descriptor.GetProperty("loopbackHost").GetString() == LoopbackHost
        && descriptor.GetProperty("scopeId").GetString() == stage.ScopeId
        && descriptor.GetProperty("runId").GetString() == stage.RunId
        && descriptor.GetProperty("branch").GetString() == stage.Branch
        && descriptor.GetProperty("head").GetString() == stage.Head);

      JsonElement portValues = descriptor.GetProperty("ports");
      Ensure(HasKeys(portValues, PortNames) && stage.LeasePorts.Count == PortNames.Length);
      var ports = new Dictionary<string, int>(StringComparer.Ordinal);
      foreach (string name in PortNames)
      {
        int port = portValues.GetProperty(name).GetInt32();
        Ensure(port is >= 1024 and <= 65535 && stage.LeasePorts.TryGetValue(name, out int leased) && leased == port);
        ports.Add(name, port);
      }
      Ensure(ports.Values.Distinct().Count() == ports.Count);
      string origin = FormattableString.Invariant($"https://wt-{stage.ScopeId}.localhost:{ports["website"]}");
      Ensure(descriptor.GetProperty("websiteOrigin").GetString() == origin);

      string prefix = $"arolariu-wt-{stage.ScopeId}";
      var volumes = new Dictionary<string, string>(StringComparer.Ordinal)
      {
        ["sql"] = $"{prefix}-sql-16.0.4305.5",
        ["cosmos"] = $"{prefix}-cosmos-en20261008",
        ["azurite"] = $"{prefix}-azurite-3.35.0",
        ["redis"] = $"{prefix}-redis-8.6.3",
      };
      JsonElement volumeValues = descriptor.GetProperty("volumes");
      Ensure(HasKeys(volumeValues, volumes.Keys) && stage.OwnedVolumes?.Count == volumes.Count);
      foreach (var (name, expected) in volumes)
      {
        Ensure(volumeValues.GetProperty(name).GetString() == expected
          && stage.OwnedVolumes!.TryGetValue(name, out string? verified) && verified == expected);
      }
      return new(stage, ports, volumes, origin);
    }
    catch (Exception exception) when (exception is JsonException or InvalidOperationException or FormatException)
    {
      // Parser diagnostics can contain caller-supplied values. Never surface them.
      throw InvalidScope();
    }
  }

  internal int Port(string name) => Ports[name];

  internal string Url(string name, string scheme) =>
    string.Create(CultureInfo.InvariantCulture, $"{scheme}://{LoopbackHost}:{Port(name)}");

  internal string BlobUrl => $"{Url("azuriteBlob", "http")}/devstoreaccount1";
  internal string QueueUrl => $"{Url("azuriteQueue", "http")}/devstoreaccount1";

  internal void LabelContainer<T>(IResourceBuilder<T> resource) where T : ContainerResource
    => resource.WithContainerRuntimeArgs("--label", $"ro.arolariu.worktree.scope={ScopeId}",
      "--label", $"ro.arolariu.worktree.run={RunId}");

  internal void ConfigureHost(IDistributedApplicationBuilder builder, string layoutRoot)
  {
    Ensure(SameCanonicalPath(layoutRoot, Root));
    // This is a model, not an executable launch path. Even a fixture or an internal caller
    // holding a valid scope cannot accidentally dispatch it through builder.Build().Run().
    builder.Eventing.Subscribe<BeforeStartEvent>((_, _) => DispatchAuthorized
      ? Task.CompletedTask : Task.FromException(new InvalidOperationException(LaunchBlocked)));
    builder.Configuration["urls"] = $"{Url("dashboardHttps", "https")};{Url("dashboardHttp", "http")}";
    builder.Configuration["ASPNETCORE_URLS"] = builder.Configuration["urls"];
    builder.Configuration["ASPIRE_DASHBOARD_OTLP_ENDPOINT_URL"] = Url("dashboardOtlpGrpc", "https");
    builder.Configuration["ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL"] = Url("dashboardOtlpHttp", "https");
    builder.Configuration["ASPIRE_RESOURCE_SERVICE_ENDPOINT_URL"] = Url("resourceService", "https");
    builder.Configuration["DOTNET_DASHBOARD_OPEN_BROWSER"] = "false";
    builder.Configuration["ASPIRE_ALLOW_UNSECURED_TRANSPORT"] = "false";
    builder.Configuration["AppHost:OtlpApiKey"] = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    builder.Configuration["Kestrel:Certificates:Default:Path"] = Runtime.ServiceCertificatePath;
    builder.Configuration["Kestrel:Certificates:Default:KeyPath"] = Runtime.ServiceKeyPath;
  }

  internal IResourceBuilder<T> WithTelemetry<T>(IResourceBuilder<T> resource, bool grpc = false)
    where T : IResourceWithEnvironment
  {
    string endpoint = Url(grpc ? "dashboardOtlpGrpc" : "dashboardOtlpHttp", "https");
    string protocol = grpc ? "grpc" : "http/protobuf";
    return resource.WithEnvironment(context =>
    {
      var environment = context.EnvironmentVariables;
      environment["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "";
      environment["APPINSIGHTS_INSTRUMENTATIONKEY"] = "";
      environment["AzureOptions__ApplicationInsightsEndpoint"] = "";
      environment["OTEL_EXPORTER_OTLP_INSECURE"] = "false";
      environment["OTEL_EXPORTER_OTLP_ENDPOINT"] = endpoint;
      environment["OTEL_EXPORTER_OTLP_PROTOCOL"] = protocol;
      string key = resource.ApplicationBuilder.Configuration["AppHost:OtlpApiKey"]
        ?? throw new InvalidOperationException("The scoped telemetry key is missing.");
      string headers = $"x-otlp-api-key={key}";
      environment["OTEL_EXPORTER_OTLP_HEADERS"] = headers;
      foreach (string signal in TelemetrySignals)
      {
        // Per-signal overrides have priority over the generic exporter configuration.
        environment[$"OTEL_EXPORTER_OTLP_{signal}_ENDPOINT"] = grpc ? endpoint : $"{endpoint}/v1/{signal.ToLowerInvariant()}";
        environment[$"OTEL_EXPORTER_OTLP_{signal}_PROTOCOL"] = protocol;
        environment[$"OTEL_EXPORTER_OTLP_{signal}_HEADERS"] = headers;
        environment[$"OTEL_EXPORTER_OTLP_{signal}_INSECURE"] = "false";
      }
    });
  }

  internal IResourceBuilder<T> WithNativeEndpoint<T>(
    IResourceBuilder<T> resource, string portName, string scheme) where T : IResourceWithEndpoints
  {
    int port = Port(portName);
    return resource.WithEndpoint(port: port, targetPort: port, scheme: scheme, name: "http", isProxied: false)
      .WithEndpoint("http", endpoint => endpoint.TargetHost = LoopbackHost);
  }

  private static void VerifyRuntimePaths(WorktreeRuntimeInputs? runtime, string directory, string root)
  {
    string python = OperatingSystem.IsWindows() ? Path.Combine("Scripts", "python.exe") : Path.Combine("bin", "python");
    if (runtime is null
      || !SameCanonicalPath(runtime.ExpConfigPath, Path.Combine(directory, "exp.json"))
      || !SameCanonicalPath(runtime.WebsiteCertificatePath, Path.Combine(directory, "website.pem"))
      || !SameCanonicalPath(runtime.WebsiteKeyPath, Path.Combine(directory, "website-key.pem"))
      || !SameCanonicalPath(runtime.ServiceCertificatePath, Path.Combine(directory, "service.pem"))
      || !SameCanonicalPath(runtime.ServiceKeyPath, Path.Combine(directory, "service-key.pem"))
      || !SameCanonicalPath(runtime.PythonExecutable, Path.Combine(root, "sites", "exp.arolariu.ro", ".venv", python))
      || !IsCanonicalPath(runtime.NodeExecutable))
    {
      throw InvalidScope();
    }
  }

  private static StringComparison PathComparison =>
    OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;

  private static bool IsCanonicalPath(string? value)
  {
    if (string.IsNullOrWhiteSpace(value) || !Path.IsPathFullyQualified(value))
      return false;
    try { return string.Equals(value, Path.GetFullPath(value), PathComparison); }
    catch (ArgumentException) { return false; }
  }

  private static bool SameCanonicalPath(string? value, string expected) =>
    IsCanonicalPath(value) && string.Equals(value, expected, PathComparison);

  private static bool IsLowerHex(string text, int length) =>
    text.Length == length && text.All(c => c is >= '0' and <= '9' or >= 'a' and <= 'f');

  private static bool HasKeys(JsonElement value, IEnumerable<string> names) =>
    value.ValueKind == JsonValueKind.Object
    && value.EnumerateObject().Select(property => property.Name).Order(StringComparer.Ordinal)
      .SequenceEqual(names.Order(StringComparer.Ordinal), StringComparer.Ordinal);

  private static void Ensure(bool condition)
  {
    if (!condition) throw InvalidScope();
  }

  private static InvalidOperationException InvalidScope() => new("Scoped AppHost descriptor or launch evidence is invalid.");
}
