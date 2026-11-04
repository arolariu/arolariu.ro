namespace LocalDevelopment.Data.Storage;

using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Queues;

/// <summary>Provisions local storage without clearing existing data.</summary>
/// <param name="blobs">The caller-owned local blob service client.</param>
/// <param name="queues">The caller-owned local queue service client.</param>
public sealed class LocalStorageProvisioner(BlobServiceClient blobs, QueueServiceClient queues)
{
  /// <summary>Creates missing invoice storage without changing existing access policies or messages.</summary>
  /// <param name="cancellationToken">Cancels provisioning and is forwarded to each provider operation.</param>
  /// <returns>A task that completes after the container and queue have been ensured.</returns>
  public async Task EnsureStorageAsync(CancellationToken cancellationToken)
  {
    await EnsureContainerAsync(LocalDataContract.BlobContainerName, cancellationToken).ConfigureAwait(false);
    await EnsureQueueAsync(LocalDataContract.AnalysisQueueName, cancellationToken).ConfigureAwait(false);
  }

  /// <summary>Replaces local blob CORS rules with the startup browser-upload policy.</summary>
  /// <param name="cancellationToken">Cancels the provider operations.</param>
  /// <returns>A task that completes after service properties are updated.</returns>
  public async Task ApplyStartupCorsAsync(CancellationToken cancellationToken)
  {
    var properties = (await blobs.GetPropertiesAsync(cancellationToken).ConfigureAwait(false)).Value;
    properties.Cors.Clear();
    properties.Cors.Add(new BlobCorsRule
    {
      AllowedOrigins = "*",
      AllowedMethods = "GET,PUT,POST,DELETE,HEAD,OPTIONS,MERGE",
      AllowedHeaders = "*",
      ExposedHeaders = "*",
      MaxAgeInSeconds = 3600,
    });
    await blobs.SetPropertiesAsync(properties, cancellationToken).ConfigureAwait(false);
  }

  /// <summary>Ensures a startup container, upgrading existing containers to public blob access.</summary>
  /// <param name="name">The container to provision.</param>
  /// <param name="cancellationToken">Cancels the provider operations.</param>
  /// <returns>True when created; false when an existing container's access policy was updated.</returns>
  public async Task<bool> EnsureStartupContainerAsync(string name, CancellationToken cancellationToken)
  {
    bool created = await EnsureContainerAsync(name, cancellationToken).ConfigureAwait(false);
    if (!created)
    {
      await blobs.GetBlobContainerClient(name).SetAccessPolicyAsync(
        PublicAccessType.Blob, cancellationToken: cancellationToken).ConfigureAwait(false);
    }
    return created;
  }

  /// <summary>Creates a queue only when missing, preserving any existing messages.</summary>
  /// <param name="name">The queue to provision.</param>
  /// <param name="cancellationToken">Cancels the provider operation.</param>
  /// <returns>A task that completes after the queue has been ensured.</returns>
  public async Task EnsureQueueAsync(string name, CancellationToken cancellationToken) =>
    await queues.GetQueueClient(name).CreateIfNotExistsAsync(cancellationToken: cancellationToken).ConfigureAwait(false);

  internal async Task<bool> EnsureContainerAsync(string name, CancellationToken cancellationToken)
  {
    var created = await blobs.GetBlobContainerClient(name)
      .CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: cancellationToken).ConfigureAwait(false);
    return created?.Value is not null;
  }
}
