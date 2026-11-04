namespace AppHost.Tests.Infrastructure.Storage;

using Azure;
using Azure.Data.Tables;
using Azure.Data.Tables.Models;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;
using global::AppHost.Infrastructure.Storage;
using global::LocalDevelopment.Tests;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies all storage data is cleared without changing service configuration.</summary>
[TestClass]
[TestCategory("LocalDataIntegration")]
[DoNotParallelize]
public sealed class LocalStorageDataResetterTests
{
  /// <summary>Exercises later SDK pages and real deletes for blobs, queues, and tables.</summary>
  [TestMethod]
  public async Task ClearAsync_MultiplePages_RemovesEveryUserResource()
  {
    await LocalDataTestFixture.VerifyAsync(("storage", "10000/tcp", "19000"),
      ("storage", "10001/tcp", "19001"), ("storage", "10002/tcp", "19002"));
    var blobs = new BlobServiceClient(LocalDataTestFixture.StorageConnectionString);
    var queues = new QueueServiceClient(LocalDataTestFixture.StorageConnectionString);
    var tables = new TableServiceClient(LocalDataTestFixture.StorageConnectionString);
    string suffix = Guid.NewGuid().ToString("N");
    foreach (string prefix in new[] { "first", "second" })
    {
      BlobContainerClient container = blobs.GetBlobContainerClient($"{prefix}-{suffix}");
      await container.CreateAsync();
      await container.GetBlobClient("custom.bin").UploadAsync(BinaryData.FromString("custom"));
      QueueClient queue = queues.GetQueueClient($"{prefix}-{suffix}");
      await queue.CreateAsync();
      await queue.SendMessageAsync("custom");
      TableClient table = tables.GetTableClient($"{prefix}{suffix}");
      await table.CreateAsync();
      await table.AddEntityAsync(new TableEntity("partition", "row") { ["Value"] = "custom" });
    }
    BlobServiceProperties properties = (await blobs.GetPropertiesAsync()).Value;
    properties.Cors.Clear();
    properties.Cors.Add(new BlobCorsRule
    {
      AllowedOrigins = "https://fixture.invalid",
      AllowedMethods = "GET",
      AllowedHeaders = "*",
      ExposedHeaders = "*",
      MaxAgeInSeconds = 60
    });
    await blobs.SetPropertiesAsync(properties);
    var containers = new List<BlobContainerItem>();
    var queueItems = new List<QueueItem>();
    var tableItems = new List<TableItem>();
    await foreach (BlobContainerItem item in blobs.GetBlobContainersAsync()) { containers.Add(item); }
    await foreach (QueueItem item in queues.GetQueuesAsync()) { queueItems.Add(item); }
    await foreach (TableItem item in tables.QueryAsync()) { tableItems.Add(item); }
    Response raw = (await blobs.GetPropertiesAsync()).GetRawResponse();
    var resetter = new LocalStorageDataResetter(
      new PaginatedBlobs(blobs, containers, raw),
      new PaginatedQueues(queues, queueItems, raw),
      new PaginatedTables(tables, tableItems, raw));

    await resetter.ClearAsync(CancellationToken.None);

    Assert.IsFalse(await blobs.GetBlobContainersAsync().GetAsyncEnumerator().MoveNextAsync());
    Assert.IsFalse(await queues.GetQueuesAsync().GetAsyncEnumerator().MoveNextAsync());
    Assert.IsFalse(await tables.QueryAsync().GetAsyncEnumerator().MoveNextAsync());
    Assert.AreEqual("https://fixture.invalid", (await blobs.GetPropertiesAsync()).Value.Cors.Single().AllowedOrigins);
    await resetter.EnsureStorageAsync(CancellationToken.None);
    Assert.AreEqual(PublicAccessType.Blob, (await blobs.GetBlobContainerClient("invoices").GetAccessPolicyAsync()).Value.BlobPublicAccess);
    Assert.IsTrue((await queues.GetQueueClient("invoice-analysis").ExistsAsync()).Value);
  }

  private static AsyncPageable<T> Pages<T>(IReadOnlyList<T> items, Response response) where T : notnull => AsyncPageable<T>.FromPages(
    [Page<T>.FromValues(items.Take(1).ToArray(), "next", response),
      Page<T>.FromValues(items.Skip(1).ToArray(), null, response)]);

  private sealed class PaginatedBlobs(BlobServiceClient client, IReadOnlyList<BlobContainerItem> items, Response response)
    : BlobServiceClient
  {
    public override AsyncPageable<BlobContainerItem> GetBlobContainersAsync(
      BlobContainerTraits traits = BlobContainerTraits.None, BlobContainerStates states = BlobContainerStates.None,
      string? prefix = null, CancellationToken cancellationToken = default) => Pages(items, response);
    public override BlobContainerClient GetBlobContainerClient(string name) => client.GetBlobContainerClient(name);
  }

  private sealed class PaginatedQueues(QueueServiceClient client, IReadOnlyList<QueueItem> items, Response response)
    : QueueServiceClient
  {
    public override AsyncPageable<QueueItem> GetQueuesAsync(QueueTraits traits = QueueTraits.None,
      string? prefix = null, CancellationToken cancellationToken = default) => Pages(items, response);
    public override QueueClient GetQueueClient(string name) => client.GetQueueClient(name);
  }

  private sealed class PaginatedTables(TableServiceClient client, IReadOnlyList<TableItem> items, Response response)
    : TableServiceClient
  {
    public override AsyncPageable<TableItem> QueryAsync(string? filter = null, int? maxPerPage = null,
      CancellationToken cancellationToken = default) => Pages(items, response);
    public override Task<Response> DeleteTableAsync(string tableName, CancellationToken cancellationToken = default) =>
      client.DeleteTableAsync(tableName, cancellationToken);
  }
}
