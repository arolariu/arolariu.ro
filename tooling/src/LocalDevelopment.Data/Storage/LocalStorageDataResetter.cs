namespace LocalDevelopment.Data.Storage;

using Azure;
using Azure.Data.Tables;
using Azure.Data.Tables.Models;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;

/// <summary>Clears all local storage data without changing account configuration.</summary>
/// <param name="blobs">The caller-owned, already-authorized local blob service client.</param>
/// <param name="queues">The caller-owned, already-authorized local queue service client.</param>
/// <param name="tables">The caller-owned, already-authorized local table service client.</param>
public sealed class LocalStorageDataResetter(
  BlobServiceClient blobs, QueueServiceClient queues, TableServiceClient tables)
{
  /// <summary>Deletes all containers, queues, and tables from the authorized local account.</summary>
  /// <param name="cancellationToken">Cancels enumeration or deletion between resources.</param>
  /// <returns>A task that completes when the enumerated resources have been removed.</returns>
  public async Task ClearAsync(CancellationToken cancellationToken)
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
  /// <param name="cancellationToken">Cancels provisioning and retry delays.</param>
  /// <returns>A task that completes after the container and queue have been ensured.</returns>
  public async Task EnsureStorageAsync(CancellationToken cancellationToken)
  {
    var provisioner = new LocalStorageProvisioner(blobs, queues);
    await EnsureAfterDeletionAsync(async token =>
    {
      await provisioner.EnsureContainerAsync(LocalDataContract.BlobContainerName, token).ConfigureAwait(false);
    }, cancellationToken).ConfigureAwait(false);
    await EnsureAfterDeletionAsync(
      token => provisioner.EnsureQueueAsync(LocalDataContract.AnalysisQueueName, token), cancellationToken).ConfigureAwait(false);
  }

  private static async Task EnsureAfterDeletionAsync(
    Func<CancellationToken, Task> ensure, CancellationToken cancellationToken)
  {
    for (int attempt = 0; ; attempt++)
    {
      cancellationToken.ThrowIfCancellationRequested();
      try
      {
        await ensure(cancellationToken).ConfigureAwait(false);
        return;
      }
      catch (RequestFailedException exception) when (attempt < 29 && exception.Status == 409
        && exception.ErrorCode is "ContainerBeingDeleted" or "QueueBeingDeleted")
      {
        await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken).ConfigureAwait(false);
      }
    }
  }
}
