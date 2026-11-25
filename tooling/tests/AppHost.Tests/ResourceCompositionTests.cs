namespace AppHost.Tests;

using System.Reflection;
using System.Text.Json;
using System.Xml.Linq;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.JavaScript;
using Azure.Core.Pipeline;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Specialized;
using Azure.Storage.Queues;
using global::AppHost.Applications.Exp;
using global::AppHost.Infrastructure;
using global::AppHost.Infrastructure.Storage;
using global::AppHost.LocalDevelopment;
using global::AppHost.LocalDevelopment.Reset;
using global::AppHost.Repository;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies the native resource model without starting processes or provisioning data.</summary>
[TestClass]
public sealed class ResourceCompositionTests
{
  [TestMethod]
  public void Compose_TwoScopes_DoesNotSharePublicAuthorityPortsOrVolumes()
  {
    var first = ScopeFixture.Create('a', 24000);
    var second = ScopeFixture.Create('b', 24100);
    var one = CreateScopedGraph(first);
    var two = CreateScopedGraph(second);
    Assert.AreNotEqual(first.WebsiteOrigin, second.WebsiteOrigin);
    Assert.IsFalse(LeaseHostPorts(one).Intersect(LeaseHostPorts(two)).Any());
    Assert.IsFalse(Volumes(one).Intersect(Volumes(two)).Any());
    CollectionAssert.AreEquivalent(first.Ports.Values.ToArray(), LeaseHostPorts(one).ToArray());
    CollectionAssert.AreEquivalent(second.Ports.Values.ToArray(), LeaseHostPorts(two).ToArray());
    CollectionAssert.AreEquivalent(first.Volumes.Values.ToArray(), Volumes(one).ToArray());
    CollectionAssert.AreEquivalent(second.Volumes.Values.ToArray(), Volumes(two).ToArray());
  }

  [TestMethod]
  public void Compose_Scoped_CosmosReadinessRequiresAContractDecisionBeforeDispatch()
  {
    var graph = CreateScopedGraph(ScopeFixture.Create('a', 24000));
    var unallocated = graph.Resources
      .SelectMany(resource => resource.Annotations.OfType<EndpointAnnotation>()
        .Where(endpoint => !endpoint.Port.HasValue)
        .Select(endpoint => $"{resource.Name}/{endpoint.Name}"))
      .ToArray();
    // The pinned integration registers a separate readiness endpoint. Do not silently
    // assign a twentieth host port or replace the existing readiness mechanism.
    CollectionAssert.AreEqual(new[] { "cosmos/emulatorhealth" }, unallocated);
  }

  [TestMethod]
  public void Compose_NoScope_PreservesExistingGraph()
  {
    var graph = CreateGraph();
    CollectionAssert.AreEquivalent(new[] { 8082, 8081, 10000, 10001, 6379, 5002, 5011, 5000, 3000, 4173, 3100, 3002 },
      graph.Builder.Resources.SelectMany(resource => resource.Annotations.OfType<EndpointAnnotation>())
        .Where(endpoint => endpoint.Port.HasValue).Select(endpoint => endpoint.Port!.Value).ToArray());
    CollectionAssert.AreEquivalent(new[] { "arolariu-mssql-data-16.0.4305.5", "arolariu-cosmos-data-en20261008",
      "arolariu-azurite-data-3.35.0", "arolariu-redis-data-8.6.3" }, Volumes(graph.Builder).ToArray());
    Assert.IsTrue(graph.Builder.Resources.Any(resource => resource.Name == "npm-install"));
    Assert.IsTrue(graph.Local.Bootstrap.Resource.Annotations.OfType<ResourceCommandAnnotation>()
      .Any(command => command.Name == "reset-local-data"));
  }

  [TestMethod]
  public async Task Compose_Scoped_UsesDerivedEndpointsAndDisablesReset()
  {
    var fixture = ScopeFixture.Create('a', 24000);
    var graph = CreateScopedGraph(fixture);
    IResource Find(string name) => graph.Resources.Single(resource => resource.Name == name);
    var website = await ResolveEnvironmentAsync(graph, Find("website"));
    var api = await ResolveEnvironmentAsync(graph, Find("api"));
    var exp = await ResolveEnvironmentAsync(graph, Find("exp"));
    var identity = await ResolveEnvironmentAsync(graph, Find("local-identities"));
    Assert.AreEqual(fixture.WebsiteOrigin, website["SITE_URL"]);
    Assert.AreEqual("https://127.0.0.1:24006", website["API_URL"]);
    Assert.AreEqual("http://127.0.0.1:24015/devstoreaccount1", website["STORAGE_BLOB_ENDPOINT"]);
    Assert.AreEqual("http://127.0.0.1:24007", api["EXP_PROXY_URL"]);
    Assert.AreEqual("http://127.0.0.1:24011", api["LOCAL_DEVELOPMENT_IDENTITY_URL"]);
    Assert.AreEqual(website["API_URL"], identity["LOCAL_SWAGGER_ORIGIN"]);
    Assert.AreEqual(fixture.Runtime.ExpConfigPath, exp["EXP_LOCAL_CONFIG_PATH"]);
    Assert.AreEqual("https://127.0.0.1:24003", exp["OTEL_EXPORTER_OTLP_ENDPOINT"]);
    Assert.AreEqual("https://127.0.0.1:24002", api["OTEL_EXPORTER_OTLP_ENDPOINT"]);
    Assert.AreEqual(exp["OTEL_EXPORTER_OTLP_ENDPOINT"], website["OTEL_EXPORTER_OTLP_ENDPOINT"]);
    Assert.AreEqual(string.Empty, website["APPLICATIONINSIGHTS_CONNECTION_STRING"]);
    Assert.AreEqual("https://127.0.0.1:24003/v1/traces", exp["OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"]);
    Assert.AreEqual("https://127.0.0.1:24000;http://127.0.0.1:24001", graph.Configuration["urls"]);
    Assert.AreEqual("https://127.0.0.1:24004", graph.Configuration["ASPIRE_RESOURCE_SERVICE_ENDPOINT_URL"]);
    Assert.IsFalse(graph.Resources.Any(resource => resource.Name.Contains("install", StringComparison.Ordinal)));
    Assert.IsFalse(graph.Resources.Any(resource => resource.Annotations.OfType<ResourceCommandAnnotation>()
      .Any(command => command.Name == "reset-local-data")));
    Assert.IsTrue(graph.Resources.SelectMany(resource => resource.Annotations.OfType<EndpointAnnotation>())
      .All(endpoint => !endpoint.IsExternal));
    var arguments = await ResolveArgumentsAsync(Find("website"));
    CollectionAssert.Contains(arguments, "--experimental-https-cert");
    CollectionAssert.Contains(arguments, fixture.Runtime.WebsiteCertificatePath);
    CollectionAssert.Contains(arguments, "127.0.0.1");
    Assert.IsFalse(arguments.OfType<string>().Any(arg => arg.Contains("inspect", StringComparison.Ordinal)));
    Assert.IsTrue(new Uri((string)website["API_URL"]).IsLoopback);
    Assert.IsFalse(new Uri((string)website["SITE_URL"]).IsLoopback);
  }

  [TestMethod]
  public void Compose_ScopedMissingOwnedConfiguration_DoesNotComposeLegacy()
  {
    var fixture = ScopeFixture.Create('a', 24000);
    var missing = fixture with { Runtime = fixture.Runtime with { VerifyExpConfig = _ => false } };
    Assert.ThrowsExactly<InvalidOperationException>(() => CreateScopedGraph(missing));
  }

  [TestMethod]
  public async Task ScopedStorage_UploadAndCorsUseTheSameScope()
  {
    WorktreeLaunchScope scope = ScopeFixture.Create('a', 24000).Load();
    using var fixture = new StorageTransport();
    using var http = new HttpClient(fixture);
    string connection = AzuriteBootstrap.CreateScopedConnectionString(scope);
    var service = new BlobServiceClient(connection, new BlobClientOptions { Transport = new HttpClientTransport(http) });
    var queue = new QueueServiceClient(connection, new QueueClientOptions { Transport = new HttpClientTransport(http) });
    var config = ExpResources.CreateScopedEndpointOverrides("synthetic-only", scope);
    Assert.AreEqual("http://127.0.0.1:24015/devstoreaccount1", config["Endpoints:Storage:Blob"]);
    Assert.AreEqual(config["Endpoints:Storage:Blob"], service.Uri.AbsoluteUri);
    Assert.AreEqual("http://127.0.0.1:24016/devstoreaccount1", config["Endpoints:Storage:Queue"]);
    Assert.AreEqual(config["Endpoints:Storage:Queue"], queue.Uri.AbsoluteUri);
    Assert.AreEqual("https://127.0.0.1:24006", config["Endpoints:Service:Api"]);
    Assert.AreEqual("", config["Endpoints:Observability:Telemetry"]);
    StringAssert.Contains(config["Endpoints:Database:SQL"], "127.0.0.1,24012");
    StringAssert.Contains(config["Endpoints:Database:NoSQL"], "http://127.0.0.1:24013/");

    CancellationToken token = TestContext.CancellationToken;
    await AzuriteBootstrap.ApplyScopedCorsAsync(service, scope, token);
    var blob = service.GetBlobContainerClient("invoices").GetBlockBlobClient("scan.png");
    using Stream payload = BinaryData.FromString("synthetic").ToStream();
    await blob.UploadAsync(payload, cancellationToken: token);
    Assert.AreEqual("http://127.0.0.1:24015/devstoreaccount1/invoices/scan.png", blob.Uri.AbsoluteUri);
    Assert.AreEqual(blob.Uri, fixture.UploadTarget);
    Assert.AreEqual(scope.WebsiteOrigin, fixture.AllowedOrigin);
  }

  public TestContext TestContext { get; set; } = null!;

  private sealed class StorageTransport : HttpMessageHandler
  {
    internal Uri? UploadTarget { get; private set; }
    internal string? AllowedOrigin { get; private set; }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
      var target = request.RequestUri!;
      Assert.AreEqual("127.0.0.1", target.Host);
      Assert.AreEqual(24015, target.Port);
      if (target.Query.Contains("comp=properties", StringComparison.Ordinal))
      {
        if (request.Method == HttpMethod.Get)
        {
          return new(System.Net.HttpStatusCode.OK)
          {
            Content = new StringContent("<StorageServiceProperties><Cors /></StorageServiceProperties>",
              System.Text.Encoding.UTF8, "application/xml"),
          };
        }
        Assert.AreEqual(HttpMethod.Put, request.Method);
        var cors = XDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
        AllowedOrigin = cors.Descendants("AllowedOrigins").Single().Value;
        return new(System.Net.HttpStatusCode.Accepted);
      }
      Assert.AreEqual(HttpMethod.Put, request.Method);
      UploadTarget = target;
      return new(System.Net.HttpStatusCode.Created)
      {
        Headers = { ETag = new System.Net.Http.Headers.EntityTagHeaderValue("\"synthetic\"") },
      };
    }
  }

  [TestMethod]
  public void Load_ForeignRootOrAuthority_RejectsScope()
  {
    var fixture = ScopeFixture.Create('a', 24000);
    Assert.ThrowsExactly<InvalidOperationException>(() => WorktreeLaunchScope.Load(fixture.Path, fixture.Root));
    Assert.ThrowsExactly<InvalidOperationException>(() => fixture.Load(Path.Combine(fixture.Root, "other")));
    Assert.ThrowsExactly<InvalidOperationException>(() => (fixture with
    {
      WebsiteOrigin = "https://localhost:24005",
    }).Load());
    Assert.ThrowsExactly<InvalidOperationException>(() => (fixture with
    {
      WebsiteOrigin = "https://wt-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.localhost:24005",
    }).Load());
  }

  [TestMethod]
  public void Load_UnverifiedEngineStorageOrRuntime_RejectsScope()
  {
    var fixture = ScopeFixture.Create('a', 24000);
    Assert.ThrowsExactly<InvalidOperationException>(() => fixture.Load(change: evidence => evidence with { Engine = "rancher" }));
    Assert.ThrowsExactly<InvalidOperationException>(() => fixture.Load(change: evidence => evidence with { OwnedVolumes = null }));
    Assert.ThrowsExactly<InvalidOperationException>(() => fixture.Load(change: evidence => evidence with { Runtime = null }));
    Assert.ThrowsExactly<InvalidOperationException>(() => fixture.Load(change: evidence => evidence with
    {
      Runtime = fixture.Runtime with { ExpConfigPath = Path.Combine(fixture.Root, "config.aspire.json") },
    }));
    Assert.ThrowsExactly<InvalidOperationException>(() => fixture.Load(change: evidence => evidence with
    {
      Runtime = fixture.Runtime with { WebsiteCertificatePath = null },
    }));
    Assert.ThrowsExactly<InvalidOperationException>(() => fixture.Load(change: evidence => evidence with
    {
      RegistryDirectory = Path.Combine(fixture.Root, "other-registry"),
    }));
    Assert.ThrowsExactly<InvalidOperationException>(() => (fixture with { Version = 2 }).Load());
    Assert.ThrowsExactly<InvalidOperationException>(() => fixture.Load(change: evidence => evidence with
    {
      LeasePorts = ScopeFixture.Create('a', 25000).Ports,
    }));
  }

  [TestMethod]
  public void Load_IncompleteOrOverlappingV1Ports_RejectsScope()
  {
    var incomplete = ScopeFixture.Create('a', 24000);
    incomplete.Ports.Remove("cosmosDataExplorer");
    incomplete.Ports.Remove("azuriteTable");
    Assert.ThrowsExactly<InvalidOperationException>(() => incomplete.Load());
    var overlapping = ScopeFixture.Create('a', 24000);
    overlapping.Ports["azuriteQueue"] = overlapping.Ports["azuriteBlob"];
    Assert.ThrowsExactly<InvalidOperationException>(() => overlapping.Load());
  }

  private static IDistributedApplicationBuilder CreateScopedGraph(ScopeFixture fixture)
  {
    var builder = DistributedApplication.CreateBuilder(new DistributedApplicationOptions
    {
      ProjectDirectory = HostDirectory(),
      DisableDashboard = true,
      Args = [],
    });
    builder.Configuration["ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL"] = "https://external.invalid:12345";
    builder.Configuration["Parameters:sql-password"] = "ambient-sql-fixture";
    builder.Configuration["Parameters:redis-password"] = "ambient-redis-fixture";
    LocalApplication.Compose(builder, RepositoryLayout.Resolve(HostDirectory()), "ambient-sql-fixture", fixture.Load());
    return builder;
  }

  private static IEnumerable<int> LeaseHostPorts(IDistributedApplicationBuilder graph) => graph.Resources
    .SelectMany(resource => resource.Annotations.OfType<EndpointAnnotation>())
    .Where(endpoint => endpoint.Port.HasValue).Select(endpoint => endpoint.Port!.Value)
    .Concat(graph.Configuration["urls"]!.Split(';').Select(value => new Uri(value).Port))
    .Concat(new[] { "ASPIRE_DASHBOARD_OTLP_ENDPOINT_URL", "ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL",
      "ASPIRE_RESOURCE_SERVICE_ENDPOINT_URL" }.Select(key => new Uri(graph.Configuration[key]!).Port));

  private static IEnumerable<string?> Volumes(IDistributedApplicationBuilder graph) => graph.Resources
    .SelectMany(resource => resource.Annotations.OfType<ContainerMountAnnotation>()).Select(mount => mount.Source);

  private sealed record ScopeFixture(string Root, string ScopeId, string RunId, string Registry,
    Dictionary<string, int> Ports, Dictionary<string, string> Volumes, string WebsiteOrigin,
    WorktreeRuntimeInputs Runtime, int Version = 1)
  {
    internal string Path => System.IO.Path.Combine(Registry, ScopeId, RunId, "descriptor.json");

    internal static ScopeFixture Create(char id, int firstPort)
    {
      string root = RepositoryLayout.Resolve(HostDirectory()).RootDirectory;
      string registry = System.IO.Path.Combine(root, "synthetic-registry-not-created");
      string scope = new(id, 32);
      string run = new('c', 32);
      string runtime = System.IO.Path.Combine(registry, scope, run, "runtime");
      string[] keys = ["dashboardHttps", "dashboardHttp", "dashboardOtlpGrpc", "dashboardOtlpHttp", "resourceService",
        "website", "api", "exp", "cv", "docs", "status", "localIdentity", "sql", "cosmos", "cosmosDataExplorer",
        "azuriteBlob", "azuriteQueue", "azuriteTable", "redis"];
      return new(root, scope, run, registry,
        keys.Select((name, index) => (name, port: firstPort + index)).ToDictionary(item => item.name, item => item.port),
        new()
        {
          ["sql"] = $"arolariu-wt-{scope}-sql-16.0.4305.5",
          ["cosmos"] = $"arolariu-wt-{scope}-cosmos-en20261008",
          ["azurite"] = $"arolariu-wt-{scope}-azurite-3.35.0",
          ["redis"] = $"arolariu-wt-{scope}-redis-8.6.3",
        },
        $"https://wt-{scope}.localhost:{firstPort + 5}",
        new(System.IO.Path.Combine(runtime, "exp.json"), System.IO.Path.Combine(runtime, "website.pem"),
          System.IO.Path.Combine(runtime, "website-key.pem"), System.IO.Path.Combine(runtime, "service.pem"),
          System.IO.Path.Combine(runtime, "service-key.pem"), System.IO.Path.Combine(runtime, "python", "Scripts", "python.exe"),
          System.IO.Path.Combine(runtime, "node.exe"), _ => true, () => "fixture-Sql-password", () => "fixture-Redis-password"));
    }

    internal WorktreeLaunchScope Load(string? expectedRoot = null, Func<VerifiedWorktreeStage, VerifiedWorktreeStage>? change = null)
    {
      byte[] descriptor = JsonSerializer.SerializeToUtf8Bytes(new
      {
        version = Version,
        root = Root,
        scopeId = ScopeId,
        runId = RunId,
        mode = "aspire",
        loopbackHost = "127.0.0.1",
        ports = Ports,
        volumes = Volumes,
        websiteOrigin = WebsiteOrigin,
      });
      var stage = new VerifiedWorktreeStage(descriptor, Registry, Root, ScopeId, RunId, "podman", new('e', 64),
        Ports, Volumes, Runtime);
      return WorktreeLaunchScope.Load(Path, expectedRoot ?? Root, (_, _) => change?.Invoke(stage) ?? stage);
    }
  }

  /// <summary>Registering the graph does not generate overlays or issue website certificates.</summary>
  [TestMethod]
  public void Compose_WithoutStart_DoesNotWriteConfigurationOrCertificates()
  {
    DirectoryInfo temporary = Directory.CreateTempSubdirectory("arolariu-composition-");
    try
    {
      RepositoryLayout layout = RepositoryLayout.Resolve(Path.Combine(temporary.FullName, "tooling", "src", "AppHost"));
      foreach (string directory in new[] { layout.ExpDirectory, layout.WebsiteDirectory,
        layout.CvDirectory, layout.DocsDirectory, layout.StatusDirectory })
      {
        Directory.CreateDirectory(directory);
      }
      File.WriteAllText(layout.SourceConfigPath, "source sentinel");
      File.WriteAllText(layout.GeneratedConfigPath, "target sentinel");
      var builder = DistributedApplication.CreateBuilder(new DistributedApplicationOptions
      {
        ProjectDirectory = HostDirectory(),
        DisableDashboard = true,
        Args = [],
      });

      _ = LocalApplication.Compose(builder, layout, "local-test-password");

      Assert.AreEqual("source sentinel", File.ReadAllText(layout.SourceConfigPath));
      Assert.AreEqual("target sentinel", File.ReadAllText(layout.GeneratedConfigPath));
      Assert.IsFalse(Directory.Exists(Path.Combine(layout.WebsiteDirectory, "certificates")));
    }
    finally { temporary.Delete(recursive: true); }
  }

  /// <summary>Verifies the real registration resolves a cycle-free, recovery-capable health check.</summary>
  [TestMethod]
  public async Task Compose_StorageHealth_ResolvesRecoveryCheckWithoutInitialProvisioning()
  {
    var graph = CreateGraph();
    using ServiceProvider provider = graph.Builder.Services.BuildServiceProvider();
    HealthCheckRegistration registration = provider
      .GetRequiredService<IOptions<HealthCheckServiceOptions>>().Value.Registrations
      .Single(check => check.Name == "azurite-bootstrap");
    IHealthCheck check = registration.Factory(provider);

    Assert.IsInstanceOfType<AzuriteBootstrap.BootstrapHealthCheck>(check);
    Assert.AreEqual(HealthStatus.Healthy, (await check.CheckHealthAsync(new HealthCheckContext())).Status);
  }

  /// <summary>Verifies all existing resources remain registered.</summary>
  [TestMethod]
  public void Compose_ExistingCapabilities_PreservesResourceNames()
  {
    var graph = CreateGraph();
    string[] names = graph.Builder.Resources.Select(resource => resource.Name).ToArray();
    string[] expected = ["mssql", "arolariu-sql", "cosmos", "primary", "invoices", "merchants",
      "storage", "blobs", "queues", "tables", "redis", "local-bootstrap", "exp", "local-identities",
      "api", "website", "cv", "docs", "status", "npm-install"];
    foreach (string name in expected) { CollectionAssert.Contains(names, name); }
  }

  /// <summary>Verifies the API still waits for successful scenario completion and dependency health.</summary>
  [TestMethod]
  public void Compose_ApiDependencies_PreservesCompletionAndReadinessGates()
  {
    var graph = CreateGraph();
    IResource api = graph.Builder.Resources.Single(resource => resource.Name == "api");
    WaitAnnotation[] waits = api.Annotations.OfType<WaitAnnotation>().ToArray();
    Assert.IsTrue(waits.Any(wait => ReferenceEquals(wait.Resource, graph.Local.Bootstrap.Resource)
      && wait.WaitType == WaitType.WaitForCompletion && wait.ExitCode == 0));
    Assert.IsTrue(waits.Any(wait => ReferenceEquals(wait.Resource, graph.Local.Identity.Resource)));
    Assert.IsTrue(waits.Any(wait => ReferenceEquals(wait.Resource, graph.Exp.Resource)));
    AssertWaits(graph.Exp.Resource, graph.Infrastructure.SqlDatabase.Resource,
      graph.Infrastructure.Cosmos.Resource, graph.Infrastructure.Storage.Resource);
    AssertWaits(graph.Local.Bootstrap.Resource, graph.Infrastructure.CosmosInvoices.Resource,
      graph.Infrastructure.CosmosMerchants.Resource, graph.Infrastructure.Blobs.Resource,
      graph.Infrastructure.Queues.Resource);
    AssertWaits(graph.Local.Identity.Resource, graph.Exp.Resource);
    IResource website = graph.Builder.Resources.Single(resource => resource.Name == "website");
    AssertWaits(website, api);
    Assert.IsTrue(api.Annotations.OfType<ResourceRelationshipAnnotation>()
      .Any(annotation => ReferenceEquals(annotation.Resource, graph.Exp.Resource)));
    Assert.IsTrue(website.Annotations.OfType<ResourceRelationshipAnnotation>()
      .Any(annotation => ReferenceEquals(annotation.Resource, api)));
    Assert.IsTrue(website.Annotations.OfType<ResourceRelationshipAnnotation>()
      .Any(annotation => ReferenceEquals(annotation.Resource, graph.Exp.Resource)));
    foreach (IResource dependency in new[] { graph.Infrastructure.CosmosDatabase.Resource,
      (IResource)graph.Infrastructure.Blobs.Resource, graph.Infrastructure.Queues.Resource })
    {
      Assert.IsTrue(graph.Local.Bootstrap.Resource.Annotations.OfType<ResourceRelationshipAnnotation>()
        .Any(annotation => ReferenceEquals(annotation.Resource, dependency)));
    }
  }

  /// <summary>Verifies the strict startup chain: exp starts only after the scenario bootstrap exits successfully.</summary>
  [TestMethod]
  public void Compose_StartupChain_ExpWaitsForSuccessfulBootstrap()
  {
    var graph = CreateGraph();
    Assert.IsTrue(graph.Exp.Resource.Annotations.OfType<WaitAnnotation>().Any(wait =>
      ReferenceEquals(wait.Resource, graph.Local.Bootstrap.Resource)
      && wait.WaitType == WaitType.WaitForCompletion && wait.ExitCode == 0));
    Assert.IsFalse(graph.Local.Bootstrap.Resource.Annotations.OfType<WaitAnnotation>()
      .Any(wait => ReferenceEquals(wait.Resource, graph.Exp.Resource)));
  }

  /// <summary>Verifies the API exposes a single HTTPS endpoint served with Aspire's developer certificate.</summary>
  [TestMethod]
  public void Compose_Api_ExposesOnlyItsHttpsEndpoint()
  {
    var graph = CreateGraph();
    IResource api = graph.Builder.Resources.Single(resource => resource.Name == "api");
    EndpointAnnotation endpoint = api.Annotations.OfType<EndpointAnnotation>().Single();
    Assert.AreEqual("http", endpoint.Name);
    Assert.AreEqual("https", endpoint.UriScheme);
    Assert.AreEqual(5000, endpoint.Port);
    Assert.IsTrue(endpoint.IsProxied);
  }

  /// <summary>Verifies the website exposes a single HTTPS endpoint, so the dashboard shows no dead HTTP link.</summary>
  [TestMethod]
  public void Compose_Website_ExposesOnlyItsHttpsEndpoint()
  {
    var graph = CreateGraph();
    IResource website = graph.Builder.Resources.Single(resource => resource.Name == "website");
    EndpointAnnotation endpoint = website.Annotations.OfType<EndpointAnnotation>().Single();
    Assert.AreEqual("http", endpoint.Name);
    Assert.AreEqual("https", endpoint.UriScheme);
    Assert.AreEqual(3000, endpoint.Port);
    Assert.IsTrue(endpoint.IsProxied);
  }

  /// <summary>
  /// Verifies the website's server trusts the OS certificate store. Next.js replaces Aspire's NODE_EXTRA_CA_CERTS with the
  /// mkcert root in its server process, which would otherwise reject the API's development certificate.
  /// </summary>
  [TestMethod]
  public async Task Compose_Website_TrustsTheSystemCertificateStore()
  {
    var graph = CreateGraph();
    IResource website = graph.Builder.Resources.Single(resource => resource.Name == "website");
    Dictionary<string, object> environment = await ResolveEnvironmentAsync(graph.Builder, website);
    Assert.IsTrue(environment.TryGetValue("NODE_USE_SYSTEM_CA", out object? value));
    Assert.AreEqual("1", value);
  }

  /// <summary>Verifies each web app reports health from a real HTTP response, not just a started process.</summary>
  [TestMethod]
  [DataRow("website", "website_http_/api/health/_200_check")]
  [DataRow("cv", "cv_http_/_200_check")]
  [DataRow("docs", "docs_http_/_200_check")]
  [DataRow("status", "status_http_/_200_check")]
  public void Compose_WebApps_HaveHttpHealthChecks(string resourceName, string key)
  {
    var graph = CreateGraph();
    IResource resource = graph.Builder.Resources.Single(item => item.Name == resourceName);
    Assert.IsTrue(resource.Annotations.OfType<HealthCheckAnnotation>().Any(check => check.Key == key));
  }

  /// <summary>Verifies the JS apps share one workspace install and none keeps a racing per-app installer.</summary>
  [TestMethod]
  public void Compose_JavaScriptApps_ShareOneWorkspaceInstall()
  {
    var graph = CreateGraph();
    JavaScriptInstallerResource install = graph.Builder.Resources.OfType<JavaScriptInstallerResource>().Single();
    Assert.AreEqual("npm-install", install.Name);
    Assert.AreEqual("npm", install.Command);
    Assert.AreEqual(RepositoryLayout.Resolve(HostDirectory()).RootDirectory, install.WorkingDirectory);
    foreach (string name in new[] { "website", "cv", "docs", "status" })
    {
      IResource app = graph.Builder.Resources.Single(resource => resource.Name == name);
      Assert.IsTrue(app.Annotations.OfType<WaitAnnotation>().Any(wait => ReferenceEquals(wait.Resource, install)
        && wait.WaitType == WaitType.WaitForCompletion && wait.ExitCode == 0));
      Assert.IsFalse(app.Annotations.OfType<JavaScriptPackageInstallerAnnotation>().Any());
      Assert.IsFalse(app.Annotations.OfType<ResourceRelationshipAnnotation>()
        .Any(relationship => relationship.Resource.Name == $"{name}-installer"));
      Assert.IsTrue(app.Annotations.OfType<JavaScriptPackageManagerAnnotation>().Any());
      if (name != "website")
      {
        Assert.IsFalse(app.Annotations.OfType<WaitAnnotation>().Any(wait => wait.Resource.Name == "api"));
      }
    }
  }

  /// <summary>Verifies the shared install skips audit/fund output and never inherits debugger NODE_OPTIONS.</summary>
  [TestMethod]
  public async Task Compose_SharedInstall_RunsNpmInstallWithoutAuditOrNodeOptions()
  {
    var graph = CreateGraph();
    JavaScriptInstallerResource install = graph.Builder.Resources.OfType<JavaScriptInstallerResource>()
      .Single(resource => resource.Name == "npm-install");
    CollectionAssert.AreEqual(new object[] { "install", "--no-audit", "--no-fund" }, await ResolveArgumentsAsync(install));
    Assert.AreEqual(string.Empty, (await ResolveEnvironmentAsync(graph.Builder, install))["NODE_OPTIONS"]);
  }

  /// <summary>Verifies fixed ports and transport/proxy choices.</summary>
  [TestMethod]
  [DataRow("mssql", "tcp", 8082, "tcp", true)]
  [DataRow("cosmos", "emulator", 8081, "http", true)]
  [DataRow("storage", "blob", 10000, "http", true)]
  [DataRow("storage", "queue", 10001, "http", true)]
  [DataRow("redis", "tcp", 6379, "redis", true)]
  [DataRow("exp", "http", 5002, "http", false)]
  [DataRow("local-identities", "http", 5011, "http", false)]
  [DataRow("api", "http", 5000, "https", true)]
  [DataRow("website", "http", 3000, "https", true)]
  [DataRow("cv", "http", 4173, "http", true)]
  [DataRow("docs", "http", 3100, "http", false)]
  [DataRow("status", "http", 3002, "http", true)]
  public void Compose_Endpoints_PreserveLocalBindings(
    string resourceName, string endpointName, int port, string scheme, bool proxied)
  {
    var graph = CreateGraph();
    IResource resource = graph.Builder.Resources.Single(item => item.Name == resourceName);
    EndpointAnnotation endpoint = resource.Annotations.OfType<EndpointAnnotation>()
      .Single(item => item.Name == endpointName);
    Assert.AreEqual(port, endpoint.Port);
    Assert.AreEqual(scheme, endpoint.UriScheme);
    Assert.AreEqual(proxied, endpoint.IsProxied);
  }

  /// <summary>Verifies local helper resources never enter a deployment manifest.</summary>
  [TestMethod]
  public void Compose_LocalHelpers_AreExcludedFromManifest()
  {
    var graph = CreateGraph();
    Assert.AreSame(ManifestPublishingCallbackAnnotation.Ignore, graph.Local.Bootstrap.Resource.Annotations
      .OfType<ManifestPublishingCallbackAnnotation>().Single());
    Assert.AreSame(ManifestPublishingCallbackAnnotation.Ignore, graph.Local.Identity.Resource.Annotations
      .OfType<ManifestPublishingCallbackAnnotation>().Single());
    Assert.IsTrue(graph.Infrastructure.Storage.Resource.Annotations
      .OfType<HealthCheckAnnotation>().Any(annotation => annotation.Key == "azurite-bootstrap"));
  }

  /// <summary>Verifies restarts retain all four named infrastructure volumes.</summary>
  [TestMethod]
  public void Compose_Infrastructure_PreservesDataVolumes()
  {
    var graph = CreateGraph();
    string?[] volumes = graph.Builder.Resources.SelectMany(resource => resource.Annotations
      .OfType<ContainerMountAnnotation>()).Select(mount => mount.Source).ToArray();
    foreach (string volume in new[] { "arolariu-mssql-data-16.0.4305.5", "arolariu-cosmos-data-en20261008",
      "arolariu-azurite-data-3.35.0", "arolariu-redis-data-8.6.3" })
    {
      CollectionAssert.Contains(volumes, volume);
    }
    foreach (string legacy in new[] { "arolariu-mssql-data", "arolariu-azurite-data", "arolariu-redis-data" })
    {
      CollectionAssert.DoesNotContain(volumes, legacy);
    }
  }

  /// <summary>Verifies native infrastructure cannot silently resolve a different image behind a mutable tag.</summary>
  [TestMethod]
  [DataRow("storage", "mcr.microsoft.com/azure-storage/azurite@sha256:647c63a91102a9d8e8000aab803436e1fc85fbb285e7ce830a82ee5d6661cf37")]
  [DataRow("mssql", "mcr.microsoft.com/mssql/server@sha256:cf8f0ab2ebe61feec2eed2629061a07d247f791c2a8ddda74a4ac9f06a291718")]
  [DataRow("redis", "docker.io/library/redis@sha256:4d25e2fe601f7ffaeb4437cb6ced3518bc36edf34ebe98863c80836943d94529")]
  public void Compose_InfrastructureImages_UsesImmutableDigests(string name, string expectedImage)
  {
    var graph = CreateGraph();
    IResource resource = graph.Builder.Resources.Single(resource => resource.Name == name);

    Assert.IsTrue(resource.TryGetContainerImageName(out string? actualImage));
    Assert.AreEqual(expectedImage, actualImage);
  }

  /// <summary>Verifies the emulator retains data with its tested image and never reuses incompatible legacy state.</summary>
  [TestMethod]
  public void Compose_CosmosEmulator_PinsWritablePersistentVolume()
  {
    var graph = CreateGraph();
    IResource cosmos = graph.Infrastructure.Cosmos.Resource;
    ContainerMountAnnotation[] mounts = cosmos.Annotations.OfType<ContainerMountAnnotation>().ToArray();
    Assert.HasCount(1, mounts);
    ContainerMountAnnotation mount = mounts[0];
    Assert.AreEqual("arolariu-cosmos-data-en20261008", mount.Source);
    Assert.AreEqual("/data", mount.Target);
    Assert.AreEqual(ContainerMountType.Volume, mount.Type);
    Assert.IsFalse(mount.IsReadOnly);
    ContainerImageAnnotation image = cosmos.Annotations.OfType<ContainerImageAnnotation>().Single();
    Assert.AreEqual("4535ddbd27bba762f3e068f7585feb0022a2559ceccc9394b23aa38d91d77c38", image.SHA256);
    Assert.IsFalse(graph.Builder.Resources.SelectMany(resource => resource.Annotations.OfType<ContainerMountAnnotation>())
      .Any(annotation => annotation.Source == "arolariu-cosmos-data"));
  }

  /// <summary>Verifies Cosmos ownership partition paths stay unchanged.</summary>
  [TestMethod]
  public void Compose_CosmosContainers_PreservesPartitionContracts()
  {
    var graph = CreateGraph();
    Assert.AreEqual("/UserIdentifier", graph.Infrastructure.CosmosInvoices.Resource.PartitionKeyPath);
    Assert.AreEqual("/ParentCompanyId", graph.Infrastructure.CosmosMerchants.Resource.PartitionKeyPath);
  }

  /// <summary>Exposes one explicit data reset without changing the ordinary Bootstrap start command.</summary>
  [TestMethod]
  public void Compose_LocalReset_RegistersExplicitCommand()
  {
    var graph = CreateGraph();
    ResourceCommandAnnotation[] commands = graph.Local.Bootstrap.Resource.Annotations.OfType<ResourceCommandAnnotation>()
      .Where(command => command.Name == "reset-local-data").ToArray();
    Assert.HasCount(1, commands);
    Assert.AreEqual("Reset local data", commands[0].DisplayName);
  }

  /// <summary>A production host has no destructive development command to discover or invoke.</summary>
  [TestMethod]
  public void Compose_LocalReset_ProductionMode_DoesNotRegisterCommand()
  {
    var graph = CreateGraph("Production");
    Assert.IsFalse(graph.Local.Bootstrap.Resource.Annotations.OfType<ResourceCommandAnnotation>()
      .Any(command => command.Name == "reset-local-data"));
  }

  /// <summary>A headless/direct command invocation cannot bypass interactive confirmation.</summary>
  [TestMethod]
  public async Task Compose_LocalReset_WithoutInteraction_FailsBeforeResolvingTargets()
  {
    var graph = CreateGraph();
    ResourceCommandAnnotation command = graph.Local.Bootstrap.Resource.Annotations.OfType<ResourceCommandAnnotation>()
      .Single(item => item.Name == "reset-local-data");
    using ServiceProvider provider = new ServiceCollection().BuildServiceProvider();

    ExecuteCommandResult result = await command.ExecuteCommand(new ExecuteCommandContext
    {
      ResourceName = "local-bootstrap",
      Services = provider,
      Logger = NullLogger.Instance,
      Arguments = new InteractionInputCollection([]),
      CancellationToken = CancellationToken.None,
    });

    Assert.IsFalse(result.Success);
    StringAssert.Contains(result.Message, "interactive");
  }

  /// <summary>A snapshot sampled while confirmation is pending must not latch the dashboard action disabled.</summary>
  [TestMethod]
  public async Task Compose_LocalReset_PendingConfirmation_DoesNotCacheDisabledState()
  {
    var graph = CreateGraph();
    IInteractionService interaction = DispatchProxy.Create<IInteractionService, PendingResetInteraction>();
    var pendingInteraction = (PendingResetInteraction)interaction;
    graph.Builder.Services.AddSingleton(interaction);
    await using DistributedApplication application = graph.Builder.Build();
    ResourceCommandAnnotation command = graph.Local.Bootstrap.Resource.Annotations.OfType<ResourceCommandAnnotation>()
      .Single(item => item.Name == "reset-local-data");
    Task<ExecuteCommandResult> execution = command.ExecuteCommand(new ExecuteCommandContext
    {
      ResourceName = "local-bootstrap",
      Services = application.Services,
      Logger = NullLogger.Instance,
      Arguments = new InteractionInputCollection([]),
      CancellationToken = CancellationToken.None,
    });
    await pendingInteraction.Entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
    ResourceCommandState sampled;
    try
    {
      sampled = command.UpdateState(new UpdateCommandStateContext
      {
        ResourceSnapshot = new CustomResourceSnapshot { ResourceType = "test", Properties = [] },
        Services = application.Services,
      });
    }
    finally
    {
      pendingInteraction.Answer.TrySetResult(InteractionResult.Ok(false));
      await execution;
    }

    Assert.AreEqual(ResourceCommandState.Enabled, sampled);
  }

  /// <summary>Controls only the external confirmation boundary; no reset store operation executes.</summary>
  public class PendingResetInteraction : DispatchProxy
  {
    internal TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    internal TaskCompletionSource<InteractionResult<bool>> Answer { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

    /// <inheritdoc />
    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
    {
      if (targetMethod?.Name == "get_IsAvailable") { return true; }
      if (targetMethod?.Name == nameof(IInteractionService.PromptConfirmationAsync))
      {
        Entered.TrySetResult();
        return Answer.Task;
      }
      throw new NotSupportedException("Only local reset confirmation is supported.");
    }
  }

  /// <summary>Verifies local safety/configuration and Python OTLP injection at the native boundary.</summary>
  [TestMethod]
  public async Task Compose_Environment_PreservesSafetyAndTelemetryContracts()
  {
    var graph = CreateGraph();
    var bootstrap = await ResolveEnvironmentAsync(graph.Builder, graph.Local.Bootstrap.Resource);
    Assert.AreEqual("Development", bootstrap["DOTNET_ENVIRONMENT"]);
    Assert.AreEqual("local", bootstrap["INFRA"]);
    Assert.AreEqual("SeedData", bootstrap["SEED_DATA_DIRECTORY"]);
    Assert.IsFalse(bootstrap.ContainsKey("AZURE_CLIENT_ID"));
    var identity = await ResolveEnvironmentAsync(graph.Builder, graph.Local.Identity.Resource);
    Assert.AreEqual("Development", identity["DOTNET_ENVIRONMENT"]);
    Assert.AreEqual("local", identity["INFRA"]);
    Assert.AreEqual("https://localhost:5000", identity["LOCAL_SWAGGER_ORIGIN"]);
    StringAssert.EndsWith((string)identity["LOCAL_CONFIG_PATH"], "config.aspire.json");
    var exp = await ResolveEnvironmentAsync(graph.Builder, graph.Exp.Resource);
    Assert.AreEqual("http/protobuf", exp["OTEL_EXPORTER_OTLP_PROTOCOL"]);
    Assert.AreEqual("https://localhost:21031", exp["OTEL_EXPORTER_OTLP_ENDPOINT"]);
    Assert.AreEqual("config.aspire.json", exp["EXP_LOCAL_CONFIG_PATH"]);
  }

  /// <summary>A host directory override reaches the real registered Bootstrap environment.</summary>
  [TestMethod]
  public async Task Compose_Environment_HonorsConfiguredSeedDirectory()
  {
    var graph = CreateGraph(seedDataDirectory: @"C:\fixture-overrides\personas");

    Dictionary<string, object> environment = await ResolveEnvironmentAsync(graph.Builder, graph.Local.Bootstrap.Resource);

    Assert.AreEqual(@"C:\fixture-overrides\personas", environment["SEED_DATA_DIRECTORY"]);
  }

  private static async Task<Dictionary<string, object>> ResolveEnvironmentAsync(
    IDistributedApplicationBuilder builder, IResource resource)
  {
    var values = new Dictionary<string, object>();
    var context = new EnvironmentCallbackContext(builder.ExecutionContext, resource, values, CancellationToken.None);
    foreach (EnvironmentCallbackAnnotation callback in resource.Annotations.OfType<EnvironmentCallbackAnnotation>())
    {
      await callback.Callback(context);
    }
    return values;
  }

  private static async Task<List<object>> ResolveArgumentsAsync(IResource resource)
  {
    var values = new List<object>();
    var context = new CommandLineArgsCallbackContext(values, resource, CancellationToken.None);
    foreach (CommandLineArgsCallbackAnnotation callback in resource.Annotations.OfType<CommandLineArgsCallbackAnnotation>())
    {
      await callback.Callback(context);
    }
    return values;
  }

  private static void AssertWaits(IResource resource, params IResource[] dependencies)
  {
    foreach (IResource dependency in dependencies)
    {
      Assert.IsTrue(resource.Annotations.OfType<WaitAnnotation>()
        .Any(wait => ReferenceEquals(wait.Resource, dependency)));
    }
  }

  private static string HostDirectory()
  {
    string bootstrapDirectory = Path.GetDirectoryName(new Projects.LocalDevelopment_Bootstrap().ProjectPath)
      ?? throw new InvalidOperationException("Bootstrap metadata requires a directory.");
    return Path.GetFullPath(Path.Combine(bootstrapDirectory, "..", "AppHost"));
  }

  internal static (IDistributedApplicationBuilder Builder, LocalInfrastructure Infrastructure,
    IResourceBuilder<ExecutableResource> Exp, LocalResources Local) CreateGraph(string environmentName = "Development",
      string? seedDataDirectory = null)
  {
    string hostDirectory = HostDirectory();
    var builder = DistributedApplication.CreateBuilder(new DistributedApplicationOptions
    {
      ProjectDirectory = hostDirectory,
      DisableDashboard = true,
      Args = [],
    });
    builder.Environment.EnvironmentName = environmentName;
    if (seedDataDirectory is not null) { builder.Configuration["SEED_DATA_DIRECTORY"] = seedDataDirectory; }
    builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
    {
      ["Parameters:sql-password"] = "local-test-password",
      ["Parameters:redis-password"] = "local-test-password",
      ["DOTNET_DASHBOARD_OTLP_HTTP_ENDPOINT_URL"] = "https://localhost:21031",
    });
    RepositoryLayout layout = RepositoryLayout.Resolve(hostDirectory);
    LocalEnvironmentResources resources = LocalApplication.Compose(builder, layout, "local-test-password");
    return (builder, resources.Infrastructure, resources.Exp, resources.Local);
  }
}
