namespace AppHost.Tests.LocalDevelopment.Reset;

using System.Net;
using System.Net.Sockets;
using Aspire.Hosting.ApplicationModel;
using Azure.Data.Tables;
using Azure.Storage.Blobs;
using Azure.Storage.Queues;
using global::AppHost.Applications;
using global::AppHost.LocalDevelopment.Reset;
using global::LocalDevelopment.Tests;
using Microsoft.Azure.Cosmos;
using Microsoft.Data.SqlClient;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Validates ownership and every resolved client before the reset may mutate any store.</summary>
[TestClass]
public sealed class LocalDataResetSafetyTests
{
  /// <summary>Valid native repository resources are accepted without accessing their databases.</summary>
  [TestMethod]
  public void ValidateResourceOwnership_LocalNativeResources_Accepts()
  {
    LocalDataResetSafety.ValidateResourceOwnership(CreateResources(), isDevelopment: true, isRunMode: true);
  }

  /// <summary>Neither production mode nor publish/deploy can authorize a local data reset.</summary>
  [TestMethod]
  [DataRow(false, true)]
  [DataRow(true, false)]
  public void ValidateResourceOwnership_NonLocalMode_Refuses(bool development, bool runMode)
  {
    Assert.ThrowsExactly<InvalidOperationException>(() =>
      LocalDataResetSafety.ValidateResourceOwnership(CreateResources(), development, runMode));
  }

  /// <summary>Matching a supplied contract cannot make archived or selfhost data an allowed target.</summary>
  [TestMethod]
  [DataRow("arolariu-cosmos-data")]
  [DataRow("arolariu-selfhost-cosmos-data")]
  public void ValidateResourceOwnership_LegacyOrSelfhostVolume_Refuses(string volume)
  {
    LocalDataResetResources resources = CreateResources();
    IResource cosmos = resources.Infrastructure.Cosmos.Resource;
    ContainerMountAnnotation previous = cosmos.Annotations.OfType<ContainerMountAnnotation>().Single();
    cosmos.Annotations.Remove(previous);
    cosmos.Annotations.Add(new ContainerMountAnnotation(volume, "/data", ContainerMountType.Volume, isReadOnly: false));
    resources = resources with { Volumes = resources.Volumes with { Cosmos = volume } };

    Assert.ThrowsExactly<InvalidOperationException>(() =>
      LocalDataResetSafety.ValidateResourceOwnership(resources, isDevelopment: true, isRunMode: true));
  }

  /// <summary>A replaced or read-only mount cannot pass by resource name alone.</summary>
  [TestMethod]
  public void ValidateResourceOwnership_UnexpectedMount_Refuses()
  {
    LocalDataResetResources resources = CreateResources() with
    {
      Volumes = new("not-the-captured-volume", "arolariu-azurite-data", "arolariu-mssql-data"),
    };

    Assert.ThrowsExactly<InvalidOperationException>(() =>
      LocalDataResetSafety.ValidateResourceOwnership(resources, isDevelopment: true, isRunMode: true));
  }

  /// <summary>An unrelated live loopback listener cannot authorize an unavailable native instance.</summary>
  [TestMethod]
  [DataRow("storage", "Exited")]
  [DataRow("cosmos", "FailedToStart")]
  [DataRow("mssql", "Waiting")]
  public void ValidateLiveInfrastructure_UnavailableNativeInstance_Refuses(string name, string state)
  {
    LocalDataResetResources resources = CreateResources();
    Dictionary<string, ResourceEvent> states = LiveStates(resources);
    ResourceEvent previous = states[name];
    using var unrelatedListener = new TcpListener(IPAddress.Loopback, 0);
    unrelatedListener.Start();
    EndpointAnnotation endpoint = previous.Resource.Annotations.OfType<EndpointAnnotation>().First();
    endpoint.AllocatedEndpoint = new AllocatedEndpoint(endpoint, "127.0.0.1",
      ((IPEndPoint)unrelatedListener.LocalEndpoint).Port);
    states[name] = new ResourceEvent(previous.Resource, previous.ResourceId, previous.Snapshot with { State = state });

    Assert.ThrowsExactly<InvalidOperationException>(() =>
      LocalDataResetSafety.ValidateLiveInfrastructure(resources, states.GetValueOrDefault));
  }

  /// <summary>A new physical container cannot reuse a previously captured native identity to authorize deletion.</summary>
  [TestMethod]
  public void ValidateLiveInfrastructure_ReplacedContainer_Refuses()
  {
    LocalDataResetResources resources = CreateResources();
    Dictionary<string, ResourceEvent> states = LiveStates(resources);
    ResourceEvent[] captured = LocalDataResetSafety.ValidateLiveInfrastructure(resources, states.GetValueOrDefault);
    ResourceEvent previous = states["storage"];
    states["storage"] = new ResourceEvent(previous.Resource, previous.ResourceId,
      previous.Snapshot with { Properties = [new("container.id", "replacement-instance")] });

    Assert.ThrowsExactly<InvalidOperationException>(() =>
      LocalDataResetSafety.ValidateLiveInfrastructure(resources, states.GetValueOrDefault, captured));
  }

  /// <summary>A cloud target in any client, including the final one, invalidates the entire operation.</summary>
  [TestMethod]
  [DataRow("cosmos")]
  [DataRow("blob")]
  [DataRow("queue")]
  [DataRow("table")]
  [DataRow("sql")]
  public void ValidateResolvedClients_CloudEndpoint_Refuses(string unsafeClient)
  {
    LocalDataResetResources resources = CreateResources();
    string cosmosHost = unsafeClient == "cosmos" ? "example.invalid" : "127.0.0.1";
    using var cosmos = new CosmosClient($"AccountEndpoint=http://{cosmosHost}:8081/;AccountKey={LocalDataTestFixture.CosmosKey}",
      new CosmosClientOptions { ConnectionMode = ConnectionMode.Gateway, LimitToEndpoint = true });
    string storage = $"DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey={LocalDataTestFixture.StorageKey};"
      + $"BlobEndpoint=http://{(unsafeClient == "blob" ? "example.invalid" : "127.0.0.1")}:10000/devstoreaccount1;"
      + $"QueueEndpoint=http://{(unsafeClient == "queue" ? "example.invalid" : "127.0.0.1")}:10001/devstoreaccount1;"
      + $"TableEndpoint=http://{(unsafeClient == "table" ? "example.invalid" : "127.0.0.1")}:19002/devstoreaccount1;";
    using var sql = new SqlConnection(
      $"Server={(unsafeClient == "sql" ? "example.invalid" : "127.0.0.1")},8082;Database=master;Integrated Security=true;Encrypt=false");

    Assert.ThrowsExactly<InvalidOperationException>(() => LocalDataResetSafety.ValidateResolvedClients(resources,
      cosmos, new BlobServiceClient(storage), new QueueServiceClient(storage), new TableServiceClient(storage), sql));
  }

  /// <summary>Matching loopback clients are accepted only at their captured native ports.</summary>
  [TestMethod]
  [DataRow(19002, true)]
  [DataRow(19003, false)]
  public void ValidateResolvedClients_LocalPort_MustMatchCapturedEndpoint(int tablePort, bool expectedValid)
  {
    LocalDataResetResources resources = CreateResources();
    resources.Infrastructure.Storage.Resource.Annotations.OfType<EndpointAnnotation>()
      .Single(endpoint => endpoint.Name == "table").Port = 19002;
    using var cosmos = new CosmosClient($"AccountEndpoint=http://127.0.0.1:8081/;AccountKey={LocalDataTestFixture.CosmosKey}",
      new CosmosClientOptions { ConnectionMode = ConnectionMode.Gateway, LimitToEndpoint = true });
    string storage = $"DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey={LocalDataTestFixture.StorageKey};"
      + "BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;"
      + $"TableEndpoint=http://127.0.0.1:{tablePort}/devstoreaccount1;";
    using var sql = new SqlConnection("Server=127.0.0.1,8082;Database=master;Integrated Security=true;Encrypt=false");
    void Validate() => LocalDataResetSafety.ValidateResolvedClients(resources, cosmos,
      new BlobServiceClient(storage), new QueueServiceClient(storage), new TableServiceClient(storage), sql);

    if (expectedValid) { Validate(); }
    else { Assert.ThrowsExactly<InvalidOperationException>(Validate); }
  }

  internal static LocalDataResetResources CreateResources()
  {
    var graph = ResourceCompositionTests.CreateGraph();
    return new(graph.Infrastructure, graph.Local,
      new LocalApplicationResources(
        graph.Builder.Resources.Single(resource => resource.Name == "api"),
        graph.Builder.Resources.Single(resource => resource.Name == "website")),
      new("arolariu-cosmos-data-en20261008", "arolariu-azurite-data", "arolariu-mssql-data"));
  }

  private static Dictionary<string, ResourceEvent> LiveStates(LocalDataResetResources resources)
  {
    IResource[] targets = [resources.Infrastructure.Cosmos.Resource, resources.Infrastructure.Storage.Resource,
      resources.Infrastructure.SqlDatabase.Resource.Parent];
    foreach (IResource target in targets)
    {
      foreach (EndpointAnnotation endpoint in target.Annotations.OfType<EndpointAnnotation>())
      {
        endpoint.AllocatedEndpoint = new AllocatedEndpoint(endpoint, "127.0.0.1", endpoint.Port ?? 19002);
      }
    }
    return targets.ToDictionary(resource => resource.Name, resource => new ResourceEvent(resource, $"{resource.Name}-native",
      new CustomResourceSnapshot
      {
        ResourceType = "Container",
        Properties = [new("container.id", $"{resource.Name}-physical-container")],
        State = KnownResourceStates.Running,
        StartTimeStamp = DateTime.UtcNow,
      }), StringComparer.Ordinal);
  }
}
