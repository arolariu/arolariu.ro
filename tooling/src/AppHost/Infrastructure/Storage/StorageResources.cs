namespace AppHost.Infrastructure.Storage;

using AppHost.LocalDevelopment;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Azure;
using global::LocalDevelopment.Data;

/// <summary>Contains storage handles used by local scenario and application resources.</summary>
internal sealed record LocalStorageResources(
  IResourceBuilder<AzureStorageResource> Storage,
  IResourceBuilder<AzureBlobStorageResource> Blobs,
  IResourceBuilder<AzureQueueStorageResource> Queues,
  IResourceBuilder<AzureTableStorageResource> Tables);

/// <summary>Registers persistent local storage and its idempotent provisioning.</summary>
internal static class StorageResources
{
  internal static LocalStorageResources AddLocalStorage(this IDistributedApplicationBuilder builder, WorktreeLaunchScope? scope = null)
  {
    int blobPort = scope?.Port("azuriteBlob") ?? Constants.AzuriteBlobPort;
    int queuePort = scope?.Port("azuriteQueue") ?? Constants.AzuriteQueuePort;
    var storage = builder.AddAzureStorage("storage")
      .RunAsEmulator(emulator =>
      {
        emulator.WithBlobPort(blobPort)
          .WithQueuePort(queuePort)
          .WithImageSHA256(Constants.AzuriteEmulatorImageSha256)
          .WithDataVolume(scope?.Volumes["azurite"] ?? Constants.AzuriteDataVolumeV3_35_0);
        if (scope is not null) emulator.WithTablePort(scope.Port("azuriteTable"));
      })
      // Keep public ports fixed while DCP manages the container-side forwarding.
      .WithEndpoint("blob", endpoint => endpoint.IsProxied = true)
      .WithEndpoint("queue", endpoint => endpoint.IsProxied = true)
      .WithIconName("Storage");
    var blobs = storage.AddBlobs("blobs");
    var queues = storage.AddQueues("queues");
    var tables = storage.AddTables("tables");
    builder.AddAzuriteBootstrap(storage, blobPort, queuePort,
      [LocalDataContract.BlobContainerName], [LocalDataContract.AnalysisQueueName], scope);
    return new(storage, blobs, queues, tables);
  }
}
