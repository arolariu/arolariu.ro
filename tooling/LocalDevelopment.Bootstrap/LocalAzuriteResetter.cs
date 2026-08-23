namespace LocalDevelopment.Bootstrap;

using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Queues;

internal interface ILocalAzuriteResetter
{
  Task ResetAsync(
    MaterializedSeedScenario scenario,
    CancellationToken cancellationToken);
}

/// <summary>
/// Resets local invoice blobs and analysis messages before uploading seed scans.
/// </summary>
internal sealed class LocalAzuriteResetter(
  BlobServiceClient blobServiceClient,
  QueueServiceClient queueServiceClient) : ILocalAzuriteResetter
{
  private const string BlobContainerName = "invoices";
  private const string AnalysisQueueName = "invoice-analysis";

  public async Task ResetAsync(
    MaterializedSeedScenario scenario,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(scenario);

    BlobContainerClient container =
      blobServiceClient.GetBlobContainerClient(BlobContainerName);
    await container
      .DeleteIfExistsAsync(cancellationToken: cancellationToken)
      .ConfigureAwait(false);
    await container
      .CreateIfNotExistsAsync(
        PublicAccessType.Blob,
        cancellationToken: cancellationToken)
      .ConfigureAwait(false);

    foreach (MaterializedSeedBlob blob in scenario.Blobs)
    {
      using var stream = new MemoryStream(blob.Content, writable: false);
      await container
        .GetBlobClient($"seed/{blob.Key}.png")
        .UploadAsync(
          stream,
          new BlobUploadOptions
          {
            HttpHeaders = new BlobHttpHeaders
            {
              ContentType = blob.ContentType,
            },
          },
          cancellationToken)
        .ConfigureAwait(false);
    }

    QueueClient queue = queueServiceClient.GetQueueClient(AnalysisQueueName);
    await queue
      .CreateIfNotExistsAsync(cancellationToken: cancellationToken)
      .ConfigureAwait(false);
    await queue
      .ClearMessagesAsync(cancellationToken)
      .ConfigureAwait(false);
  }

  internal async Task EnsureStorageAsync(CancellationToken cancellationToken)
  {
    await blobServiceClient
      .GetBlobContainerClient(BlobContainerName)
      .CreateIfNotExistsAsync(
        PublicAccessType.Blob,
        cancellationToken: cancellationToken)
      .ConfigureAwait(false);
    await queueServiceClient
      .GetQueueClient(AnalysisQueueName)
      .CreateIfNotExistsAsync(cancellationToken: cancellationToken)
      .ConfigureAwait(false);
  }
}
