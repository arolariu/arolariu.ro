namespace LocalDevelopment.Data.Storage;

using Azure;
using Azure.Data.Tables;
using Azure.Data.Tables.Models;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;
using LocalDevelopment.Common.Http.Resilience;

/// <summary>Provisions and clears local storage using caller-owned, already-authorized clients.</summary>
public static class StorageDataProvider
{
  /// <summary>Deletes all containers, queues, and tables from the authorized local account.</summary>
  /// <param name="blobs">The caller-owned, already-authorized local blob service client.</param>
  /// <param name="queues">The caller-owned, already-authorized local queue service client.</param>
  /// <param name="tables">The caller-owned, already-authorized local table service client.</param>
  /// <param name="cancellationToken">Cancels enumeration or deletion between resources.</param>
  /// <returns>A task that completes when the enumerated resources have been removed.</returns>
  public static async Task ClearAsync(
    BlobServiceClient blobs, QueueServiceClient queues, TableServiceClient tables, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    var containers = new List<string>();
    await foreach (BlobContainerItem container in blobs.GetBlobContainersAsync(cancellationToken: cancellationToken)
      .ConfigureAwait(false))
    {
      containers.Add(container.Name);
    }
    foreach (string name in containers)
    {
      cancellationToken.ThrowIfCancellationRequested();
      await blobs.GetBlobContainerClient(name).DeleteIfExistsAsync(cancellationToken: cancellationToken).ConfigureAwait(false);
    }
    var queueNames = new List<string>();
    await foreach (QueueItem queue in queues.GetQueuesAsync(cancellationToken: cancellationToken).ConfigureAwait(false))
    {
      queueNames.Add(queue.Name);
    }
    foreach (string name in queueNames)
    {
      cancellationToken.ThrowIfCancellationRequested();
      await queues.GetQueueClient(name).DeleteIfExistsAsync(cancellationToken).ConfigureAwait(false);
    }
    var tableNames = new List<string>();
    await foreach (TableItem table in tables.QueryAsync(cancellationToken: cancellationToken).ConfigureAwait(false))
    {
      tableNames.Add(table.Name);
    }
    foreach (string name in tableNames)
    {
      cancellationToken.ThrowIfCancellationRequested();
      try { await tables.DeleteTableAsync(name, cancellationToken).ConfigureAwait(false); }
      catch (RequestFailedException exception) when (exception.Status == 404) { }
    }
  }

  /// <summary>Restores invoice storage, retrying only the provider's in-progress deletion conflicts.</summary>
  /// <param name="blobs">The caller-owned local blob service client.</param>
  /// <param name="queues">The caller-owned local queue service client.</param>
  /// <param name="cancellationToken">Cancels provisioning and retry delays.</param>
  /// <param name="retryPolicy">Overrides the named deletion-pending policy for this operation when supplied.</param>
  /// <returns>A task that completes after the container and queue have been ensured.</returns>
  public static async Task RestoreStorageAsync(
    BlobServiceClient blobs, QueueServiceClient queues, CancellationToken cancellationToken, RetryPolicy? retryPolicy = null)
  {
    RetryPolicy policy = retryPolicy ?? LocalDataRetryPolicies.Default[LocalDataRetryPolicies.StorageDeletionPending];
    await RetryExecutor.ExecuteAsync(policy, async token =>
    {
      await EnsureContainerAsync(blobs, LocalDataContract.BlobContainerName, token).ConfigureAwait(false);
    }, cancellationToken).ConfigureAwait(false);
    await RetryExecutor.ExecuteAsync(policy,
      token => EnsureQueueAsync(queues, LocalDataContract.AnalysisQueueName, token), cancellationToken).ConfigureAwait(false);
  }

  /// <summary>Creates missing invoice storage without changing existing access policies or messages.</summary>
  /// <param name="blobs">The caller-owned local blob service client.</param>
  /// <param name="queues">The caller-owned local queue service client.</param>
  /// <param name="cancellationToken">Cancels provisioning and is forwarded to each provider operation.</param>
  /// <returns>A task that completes after the container and queue have been ensured.</returns>
  public static async Task EnsureStorageAsync(
    BlobServiceClient blobs, QueueServiceClient queues, CancellationToken cancellationToken)
  {
    await EnsureContainerAsync(blobs, LocalDataContract.BlobContainerName, cancellationToken).ConfigureAwait(false);
    await EnsureQueueAsync(queues, LocalDataContract.AnalysisQueueName, cancellationToken).ConfigureAwait(false);
  }

  /// <summary>Replaces local blob CORS rules with the startup browser-upload policy.</summary>
  /// <param name="blobs">The caller-owned local blob service client.</param>
  /// <param name="cancellationToken">Cancels the provider operations.</param>
  /// <returns>A task that completes after service properties are updated.</returns>
  public static async Task ApplyStartupCorsAsync(BlobServiceClient blobs, CancellationToken cancellationToken)
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
  /// <param name="blobs">The caller-owned local blob service client.</param>
  /// <param name="name">The container to provision.</param>
  /// <param name="cancellationToken">Cancels the provider operations.</param>
  /// <returns>True when created; false when an existing container's access policy was updated.</returns>
  public static async Task<bool> EnsureStartupContainerAsync(
    BlobServiceClient blobs, string name, CancellationToken cancellationToken)
  {
    bool created = await EnsureContainerAsync(blobs, name, cancellationToken).ConfigureAwait(false);
    if (!created)
    {
      await blobs.GetBlobContainerClient(name).SetAccessPolicyAsync(
        PublicAccessType.Blob, cancellationToken: cancellationToken).ConfigureAwait(false);
    }
    return created;
  }

  /// <summary>Creates a queue only when missing, preserving any existing messages.</summary>
  /// <param name="queues">The caller-owned local queue service client.</param>
  /// <param name="name">The queue to provision.</param>
  /// <param name="cancellationToken">Cancels the provider operation.</param>
  /// <returns>A task that completes after the queue has been ensured.</returns>
  public static async Task EnsureQueueAsync(QueueServiceClient queues, string name, CancellationToken cancellationToken) =>
    await queues.GetQueueClient(name).CreateIfNotExistsAsync(cancellationToken: cancellationToken).ConfigureAwait(false);

  private static async Task<bool> EnsureContainerAsync(BlobServiceClient blobs, string name, CancellationToken cancellationToken)
  {
    var created = await blobs.GetBlobContainerClient(name)
      .CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: cancellationToken).ConfigureAwait(false);
    return created?.Value is not null;
  }

}
