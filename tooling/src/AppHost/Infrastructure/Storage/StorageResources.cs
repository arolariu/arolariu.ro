namespace AppHost.Infrastructure.Storage;

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
  internal static LocalStorageResources AddLocalStorage(this IDistributedApplicationBuilder builder)
  {
    var storage = builder.AddAzureStorage("storage")
      .RunAsEmulator(emulator => emulator
        .WithBlobPort(Constants.AzuriteBlobPort)
        .WithQueuePort(Constants.AzuriteQueuePort)
        .WithImageSHA256(Constants.AzuriteEmulatorImageSha256)
        .WithDataVolume(Constants.AzuriteDataVolumeV3_35_0))
      // Keep public ports fixed while DCP manages the container-side forwarding.
      .WithEndpoint("blob", endpoint => endpoint.IsProxied = true)
      .WithEndpoint("queue", endpoint => endpoint.IsProxied = true)
      .WithIconName("Storage");
    var blobs = storage.AddBlobs("blobs");
    var queues = storage.AddQueues("queues");
    var tables = storage.AddTables("tables");
    builder.AddAzuriteBootstrap(storage, Constants.AzuriteBlobPort, Constants.AzuriteQueuePort,
      [LocalDataContract.BlobContainerName], [LocalDataContract.AnalysisQueueName]);
    return new(storage, blobs, queues, tables);
  }
}
