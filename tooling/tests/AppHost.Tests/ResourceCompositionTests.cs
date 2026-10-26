namespace AppHost.Tests;

using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Python;
using global::AppHost.Applications;
using global::AppHost.Applications.Exp;
using global::AppHost.Infrastructure;
using global::AppHost.Infrastructure.Storage;
using global::AppHost.LocalDevelopment;
using global::AppHost.Repository;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies the native resource model without starting processes or provisioning data.</summary>
[TestClass]
public sealed class ResourceCompositionTests
{
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
      "storage", "blobs", "queues", "redis", "local-bootstrap", "exp", "local-identities",
      "api", "website", "cv", "docs", "status"];
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

  /// <summary>Verifies fixed ports and transport/proxy choices.</summary>
  [TestMethod]
  [DataRow("mssql", "tcp", 8082, "tcp", false)]
  [DataRow("cosmos", "emulator", 8081, "http", false)]
  [DataRow("storage", "blob", 10000, "http", false)]
  [DataRow("storage", "queue", 10001, "http", false)]
  [DataRow("redis", "tcp", 6379, "redis", true)]
  [DataRow("exp", "http", 5002, "http", false)]
  [DataRow("local-identities", "http", 5011, "http", false)]
  [DataRow("api", "http", 5000, "http", true)]
  [DataRow("website", "https", 3000, "https", true)]
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
    foreach (string volume in new[] { "arolariu-mssql-data", "arolariu-cosmos-data",
      "arolariu-azurite-data", "arolariu-redis-data" })
    {
      CollectionAssert.Contains(volumes, volume);
    }
  }

  /// <summary>Verifies Cosmos ownership partition paths stay unchanged.</summary>
  [TestMethod]
  public void Compose_CosmosContainers_PreservesPartitionContracts()
  {
    var graph = CreateGraph();
    Assert.AreEqual("/UserIdentifier", graph.Infrastructure.CosmosInvoices.Resource.PartitionKeyPath);
    Assert.AreEqual("/ParentCompanyId", graph.Infrastructure.CosmosMerchants.Resource.PartitionKeyPath);
  }

  /// <summary>Verifies local safety/configuration and Python OTLP injection at the native boundary.</summary>
  [TestMethod]
  public async Task Compose_Environment_PreservesSafetyAndTelemetryContracts()
  {
    var graph = CreateGraph();
    async Task<Dictionary<string, object>> Environment(IResource resource)
    {
      var values = new Dictionary<string, object>();
      var context = new EnvironmentCallbackContext(
        graph.Builder.ExecutionContext, resource, values, CancellationToken.None);
      foreach (EnvironmentCallbackAnnotation callback in resource.Annotations.OfType<EnvironmentCallbackAnnotation>())
      {
        await callback.Callback(context);
      }
      return values;
    }
    var bootstrap = await Environment(graph.Local.Bootstrap.Resource);
    Assert.AreEqual("Development", bootstrap["DOTNET_ENVIRONMENT"]);
    Assert.AreEqual("local", bootstrap["INFRA"]);
    Assert.AreEqual("SeedData/scenario.v1.json", bootstrap["SEED_MANIFEST_PATH"]);
    var identity = await Environment(graph.Local.Identity.Resource);
    Assert.AreEqual("Development", identity["DOTNET_ENVIRONMENT"]);
    Assert.AreEqual("local", identity["INFRA"]);
    Assert.AreEqual("http://localhost:5000", identity["LOCAL_SWAGGER_ORIGIN"]);
    StringAssert.EndsWith((string)identity["LOCAL_CONFIG_PATH"], "config.aspire.json");
    var exp = await Environment(graph.Exp.Resource);
    Assert.AreEqual("http/protobuf", exp["OTEL_EXPORTER_OTLP_PROTOCOL"]);
    Assert.AreEqual("https://localhost:21031", exp["OTEL_EXPORTER_OTLP_ENDPOINT"]);
    Assert.AreEqual("config.aspire.json", exp["EXP_LOCAL_CONFIG_PATH"]);
  }

  private static void AssertWaits(IResource resource, params IResource[] dependencies)
  {
    foreach (IResource dependency in dependencies)
    {
      Assert.IsTrue(resource.Annotations.OfType<WaitAnnotation>()
        .Any(wait => ReferenceEquals(wait.Resource, dependency)));
    }
  }

  private static (IDistributedApplicationBuilder Builder, LocalInfrastructure Infrastructure,
    IResourceBuilder<PythonAppResource> Exp, LocalResources Local) CreateGraph()
  {
    string bootstrapDirectory = Path.GetDirectoryName(new Projects.LocalDevelopment_Bootstrap().ProjectPath)
      ?? throw new InvalidOperationException("Bootstrap metadata requires a directory.");
    string hostDirectory = Path.GetFullPath(Path.Combine(bootstrapDirectory, "..", "AppHost"));
    var builder = DistributedApplication.CreateBuilder(new DistributedApplicationOptions
    {
      ProjectDirectory = hostDirectory,
      DisableDashboard = true,
      Args = [],
    });
    builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
    {
      ["Parameters:sql-password"] = "local-test-password",
      ["Parameters:redis-password"] = "local-test-password",
      ["DOTNET_DASHBOARD_OTLP_HTTP_ENDPOINT_URL"] = "https://localhost:21031",
    });
    RepositoryLayout layout = RepositoryLayout.Resolve(hostDirectory);
    LocalInfrastructure infrastructure = builder.AddInfrastructure("local-test-password");
    IResourceBuilder<PythonAppResource> exp = builder.AddExp(infrastructure, layout);
    LocalResources local = builder.AddLocalResources(infrastructure, exp, layout);
    builder.AddApplications(layout, exp, local);
    return (builder, infrastructure, exp, local);
  }
}
