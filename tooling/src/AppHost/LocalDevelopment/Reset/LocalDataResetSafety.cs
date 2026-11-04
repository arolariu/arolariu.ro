namespace AppHost.LocalDevelopment.Reset;

using System.Data.Common;
using Aspire.Hosting.ApplicationModel;
using Azure.Data.Tables;
using Azure.Storage.Blobs;
using Azure.Storage.Queues;
using Microsoft.Azure.Cosmos;

/// <summary>Validates the complete captured native target bundle before any destructive operation.</summary>
internal static class LocalDataResetSafety
{
  internal static void ValidateResourceOwnership(LocalDataResetResources resources, bool isDevelopment, bool isRunMode)
  {
    ArgumentNullException.ThrowIfNull(resources);
    if (!isDevelopment || !isRunMode
      || resources.Infrastructure.Cosmos.Resource.Name != "cosmos"
      || resources.Infrastructure.Storage.Resource.Name != "storage"
      || resources.Infrastructure.SqlDatabase.Resource.Parent.Name != "mssql"
      || resources.Helpers.Bootstrap.Resource.Name != "local-bootstrap"
      || resources.Helpers.Identity.Resource.Name != "local-identities"
      || resources.Applications.Exp.Name != "exp"
      || resources.Applications.Api.Name != "api" || resources.Applications.Website.Name != "website")
    {
      throw new InvalidOperationException("Local data reset refused a non-local or unowned resource graph.");
    }
    ValidateMount(resources.Infrastructure.Cosmos.Resource, resources.Volumes.Cosmos, "/data");
    ValidateMount(resources.Infrastructure.Storage.Resource, resources.Volumes.Storage, "/data");
    ValidateMount(resources.Infrastructure.SqlDatabase.Resource.Parent, resources.Volumes.Sql, "/var/opt/mssql");
    if (!HasImageSha256(resources.Infrastructure.Cosmos.Resource, Constants.CosmosEmulatorImageSha256)
      || !HasImageSha256(resources.Infrastructure.Storage.Resource, Constants.AzuriteEmulatorImageSha256)
      || !HasImageSha256(resources.Infrastructure.SqlDatabase.Resource.Parent, Constants.SqlServerImageSha256)
      || !ReferenceEquals(resources.Infrastructure.Blobs.Resource.Parent, resources.Infrastructure.Storage.Resource)
      || !ReferenceEquals(resources.Infrastructure.Queues.Resource.Parent, resources.Infrastructure.Storage.Resource)
      || !ReferenceEquals(resources.Infrastructure.Tables.Resource.Parent, resources.Infrastructure.Storage.Resource))
    {
      throw new InvalidOperationException("Local data reset refused an unexpected emulator image or storage owner.");
    }
  }

  internal static void ValidateResolvedClients(LocalDataResetResources resources, CosmosClient cosmos,
    BlobServiceClient blobs, QueueServiceClient queues, TableServiceClient tables, DbConnection sqlMaster)
  {
    ArgumentNullException.ThrowIfNull(resources);
    ArgumentNullException.ThrowIfNull(cosmos);
    ArgumentNullException.ThrowIfNull(blobs);
    ArgumentNullException.ThrowIfNull(queues);
    ArgumentNullException.ThrowIfNull(tables);
    ArgumentNullException.ThrowIfNull(sqlMaster);
    string source = sqlMaster.DataSource;
    if (source.StartsWith("tcp:", StringComparison.OrdinalIgnoreCase)) { source = source[4..]; }
    if (!Uri.TryCreate($"tcp://{source.Replace(',', ':')}", UriKind.Absolute, out Uri? sqlEndpoint)
      || !IsLocal(cosmos.Endpoint) || !IsLocal(blobs.Uri) || !IsLocal(queues.Uri) || !IsLocal(tables.Uri)
      || !sqlEndpoint.IsLoopback || !string.Equals(sqlMaster.Database, "master", StringComparison.OrdinalIgnoreCase)
      || blobs.AccountName != "devstoreaccount1" || queues.AccountName != "devstoreaccount1"
      || tables.AccountName != "devstoreaccount1")
    {
      throw new InvalidOperationException("Local data reset refused a non-emulator client target.");
    }
    RequirePort(cosmos.Endpoint, resources.Infrastructure.Cosmos.Resource, "emulator");
    RequirePort(blobs.Uri, resources.Infrastructure.Storage.Resource, "blob");
    RequirePort(queues.Uri, resources.Infrastructure.Storage.Resource, "queue");
    RequirePort(tables.Uri, resources.Infrastructure.Storage.Resource, "table");
    RequirePort(sqlEndpoint, resources.Infrastructure.SqlDatabase.Resource.Parent, "tcp");
  }

  internal static ResourceEvent[] ValidateLiveInfrastructure(LocalDataResetResources resources,
    Func<string, ResourceEvent?> currentState, IReadOnlyList<ResourceEvent>? expected = null)
  {
    IResource[] targets = [resources.Infrastructure.Cosmos.Resource, resources.Infrastructure.Storage.Resource,
      resources.Infrastructure.SqlDatabase.Resource.Parent];
    if (expected is not null && expected.Count != targets.Length)
    {
      throw new InvalidOperationException("Local data reset has no complete captured native execution.");
    }
    ResourceEvent[] instances = new ResourceEvent[targets.Length];
    for (int index = 0; index < targets.Length; index++)
    {
      IResource resource = targets[index];
      ResourceEvent? live = currentState(resource.Name);
      if (live is null || !ReferenceEquals(live.Resource, resource)
        || live.Snapshot.State?.Text != KnownResourceStates.Running
        || live.Snapshot.StartTimeStamp is null || string.IsNullOrEmpty(live.ResourceId)
        || string.IsNullOrWhiteSpace(ContainerId(live))
        || (expected is not null && (live.ResourceId != expected[index].ResourceId
          || live.Snapshot.StartTimeStamp != expected[index].Snapshot.StartTimeStamp
          || ContainerId(live) != ContainerId(expected[index]))))
      {
        throw new InvalidOperationException("Local data reset refused an unavailable or replaced native infrastructure execution.");
      }
      instances[index] = live;
    }
    (IResource Resource, string Endpoint)[] endpoints =
    [
      (targets[0], "emulator"), (targets[1], "blob"), (targets[1], "queue"), (targets[1], "table"), (targets[2], "tcp"),
    ];
    foreach ((IResource resource, string name) in endpoints)
    {
      EndpointAnnotation? endpoint = resource.Annotations.OfType<EndpointAnnotation>()
        .SingleOrDefault(item => item.Name == name);
      if (endpoint?.AllocatedEndpoint is not AllocatedEndpoint allocation || !ReferenceEquals(allocation.Endpoint, endpoint))
      {
        throw new InvalidOperationException("Local data reset refused an endpoint without its native allocation.");
      }
    }
    return instances;
  }

  private static string? ContainerId(ResourceEvent change) => change.Snapshot.Properties
    .Where(property => property.Name == "container.id").Select(property => property.Value?.ToString()).SingleOrDefault();

  private static bool HasImageSha256(IResource resource, string expected) => resource.Annotations
    .OfType<ContainerImageAnnotation>().LastOrDefault()?.SHA256 == expected;

  private static bool IsLocal(Uri uri) =>
    uri.IsLoopback && uri.Scheme is "http" or "https" && string.IsNullOrEmpty(uri.UserInfo)
    && string.IsNullOrEmpty(uri.Query) && string.IsNullOrEmpty(uri.Fragment);

  private static void ValidateMount(IResource resource, string expected, string target)
  {
    ContainerMountAnnotation[] mounts = resource.Annotations.OfType<ContainerMountAnnotation>()
      .Where(mount => mount.Target == target).ToArray();
    if (expected == "arolariu-cosmos-data" || expected.StartsWith("arolariu-selfhost-", StringComparison.Ordinal)
      || mounts.Length != 1 || mounts[0].Source != expected || mounts[0].Type != ContainerMountType.Volume
      || mounts[0].IsReadOnly)
    {
      throw new InvalidOperationException("Local data reset refused an unexpected, archived, or read-only data volume.");
    }
  }

  private static void RequirePort(Uri actual, IResource resource, string name)
  {
    EndpointAnnotation? endpoint = resource.Annotations.OfType<EndpointAnnotation>().SingleOrDefault(item => item.Name == name);
    int? port = endpoint?.AllocatedEndpoint?.Port ?? endpoint?.Port;
    if (port is null || actual.Port != port)
    {
      throw new InvalidOperationException("Local data reset client does not match its captured native endpoint.");
    }
  }
}
