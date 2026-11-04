namespace AppHost.Tests;

using System.Reflection;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.JavaScript;
using Aspire.Hosting.Python;
using global::AppHost.Applications;
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
  [DataRow("mssql", "tcp", 8082, "tcp", false)]
  [DataRow("cosmos", "emulator", 8081, "http", false)]
  [DataRow("storage", "blob", 10000, "http", false)]
  [DataRow("storage", "queue", 10001, "http", false)]
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
    Assert.AreEqual("SeedData/scenario.v1.json", bootstrap["SEED_MANIFEST_PATH"]);
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
    IResourceBuilder<PythonAppResource> Exp, LocalResources Local) CreateGraph(string environmentName = "Development")
  {
    string hostDirectory = HostDirectory();
    var builder = DistributedApplication.CreateBuilder(new DistributedApplicationOptions
    {
      ProjectDirectory = hostDirectory,
      DisableDashboard = true,
      Args = [],
    });
    builder.Environment.EnvironmentName = environmentName;
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
    LocalApplicationResources applications = builder.AddApplications(layout, exp, local);
    builder.AddLocalDataReset(new(infrastructure, local, applications,
      new(Constants.CosmosDataVolumeEn20261008, Constants.AzuriteDataVolumeV3_35_0, Constants.SqlDataVolumeV16_0_4305_5)));
    return (builder, infrastructure, exp, local);
  }
}
