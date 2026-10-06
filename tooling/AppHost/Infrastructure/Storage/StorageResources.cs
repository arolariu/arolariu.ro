namespace AppHost.Infrastructure.Storage;

using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Azure;

/// <summary>Contains storage handles used by local scenario and application resources.</summary>
internal sealed record LocalStorageResources(
  IResourceBuilder<AzureStorageResource> Storage,
  IResourceBuilder<AzureBlobStorageResource> Blobs,
  IResourceBuilder<AzureQueueStorageResource> Queues);

/// <summary>Registers persistent local storage and its idempotent provisioning.</summary>
internal static class StorageResources
{
  internal static LocalStorageResources AddLocalStorage(this IDistributedApplicationBuilder builder)
  {
    var storage = builder.AddAzureStorage("storage")
      .RunAsEmulator(emulator => emulator
        .WithBlobPort(Constants.AzuriteBlobPort)
        .WithQueuePort(Constants.AzuriteQueuePort)
        .WithDataVolume(Constants.AzuriteDataVolume))
      // Native processes and the browser use fixed loopback ports, not DCP proxy ports.
      .WithEndpoint("blob", endpoint => endpoint.IsProxied = false)
      .WithEndpoint("queue", endpoint => endpoint.IsProxied = false)
      .WithIconName("Storage");
    var blobs = storage.AddBlobs("blobs");
    var queues = storage.AddQueues("queues");
    builder.AddAzuriteBootstrap(storage, Constants.AzuriteBlobPort, Constants.AzuriteQueuePort,
      ["invoices"], [Constants.AnalysisQueueName]);
    return new(storage, blobs, queues);
  }
}
