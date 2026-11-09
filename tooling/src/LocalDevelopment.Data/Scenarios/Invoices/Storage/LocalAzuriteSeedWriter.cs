namespace LocalDevelopment.Data.Scenarios.Invoices.Storage;

using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Queues;
using LocalDevelopment.Data.Storage;

internal interface ILocalAzuriteSeedWriter
{
  Task EnsureSeedAsync(
    MaterializedSeedScenario scenario,
    CancellationToken cancellationToken);
}

/// <summary>
/// Creates missing local seed scans without replacing blobs or clearing analysis messages.
/// </summary>
internal sealed class LocalAzuriteSeedWriter(
  BlobServiceClient blobServiceClient,
  QueueServiceClient queueServiceClient) : ILocalAzuriteSeedWriter
{

  public async Task EnsureSeedAsync(
    MaterializedSeedScenario scenario,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(scenario);

    await StorageDataProvider.EnsureStorageAsync(
      blobServiceClient, queueServiceClient, cancellationToken).ConfigureAwait(false);
    BlobContainerClient container = blobServiceClient.GetBlobContainerClient(LocalDataContract.BlobContainerName);

    foreach (MaterializedSeedBlob blob in scenario.Blobs)
    {
      using var stream = new MemoryStream(blob.Content, writable: false);
      try
      {
        await container.GetBlobClient($"seed/{blob.Key}.png").UploadAsync(
          stream, new BlobUploadOptions
          {
            Conditions = new BlobRequestConditions { IfNoneMatch = ETag.All },
            HttpHeaders = new BlobHttpHeaders
            {
              ContentType = blob.ContentType,
            },
          }, cancellationToken).ConfigureAwait(false);
      }
      catch (RequestFailedException exception) when (
        (exception.Status == 409 && exception.ErrorCode == "BlobAlreadyExists")
        || (exception.Status == 412 && exception.ErrorCode == "ConditionNotMet"))
      {
        // Existing scans, including user-edited seed scans, belong to the developer.
      }
    }
  }

}
