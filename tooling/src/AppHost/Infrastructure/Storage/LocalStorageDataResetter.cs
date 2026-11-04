namespace AppHost.Infrastructure.Storage;

using Azure;
using Azure.Data.Tables;
using Azure.Data.Tables.Models;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;

/// <summary>Clears all local storage data without changing account configuration.</summary>
internal sealed class LocalStorageDataResetter(
  BlobServiceClient blobs, QueueServiceClient queues, TableServiceClient tables)
{
  internal async Task ClearAsync(CancellationToken cancellationToken)
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

  internal async Task EnsureStorageAsync(CancellationToken cancellationToken)
  {
    await EnsureAfterDeletionAsync(async token =>
    {
      await blobs.GetBlobContainerClient("invoices").CreateIfNotExistsAsync(
        PublicAccessType.Blob, cancellationToken: token).ConfigureAwait(false);
    }, cancellationToken).ConfigureAwait(false);
    await EnsureAfterDeletionAsync(async token =>
    {
      await queues.GetQueueClient(Constants.AnalysisQueueName).CreateIfNotExistsAsync(
        cancellationToken: token).ConfigureAwait(false);
    }, cancellationToken).ConfigureAwait(false);
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
