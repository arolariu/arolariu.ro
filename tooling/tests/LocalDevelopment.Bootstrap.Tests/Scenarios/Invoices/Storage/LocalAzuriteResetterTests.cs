namespace LocalDevelopment.Bootstrap.Tests.Scenarios.Invoices.Storage;

using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Queues;
using global::LocalDevelopment.Bootstrap.Scenarios.Invoices.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies storage-only provisioning at the real resetter's SDK boundary.</summary>
[TestClass]
public sealed class LocalAzuriteResetterTests
{
  /// <summary>Verifies storage-only calls create only, preserving names, access and tokens.</summary>
  [TestMethod]
  public async Task EnsureStorageAsync_StorageOnly_CreatesWithoutResetting()
  {
    using var source = new CancellationTokenSource();
    var operations = new List<string>();
    var blobs = new RecordingBlobs(operations);
    var queues = new RecordingQueues(operations);
    await new LocalAzuriteResetter(blobs, queues).EnsureStorageAsync(source.Token);
    CollectionAssert.AreEqual(new[] { "blob:invoices", "blob-create", "queue:invoice-analysis", "queue-create" }, operations);
    Assert.AreEqual(PublicAccessType.Blob, blobs.Container.Access);
    Assert.AreEqual(source.Token, blobs.Container.Token);
    Assert.AreEqual(source.Token, queues.Queue.Token);
  }

  private sealed class RecordingBlobs(List<string> operations) : BlobServiceClient
  {
    internal RecordingContainer Container { get; } = new(operations);
    public override BlobContainerClient GetBlobContainerClient(string name)
    {
      operations.Add($"blob:{name}");
      return Container;
    }
  }

  private sealed class RecordingContainer(List<string> operations) : BlobContainerClient
  {
    internal PublicAccessType Access { get; private set; }
    internal CancellationToken Token { get; private set; }
    public override Task<Response<BlobContainerInfo>> CreateIfNotExistsAsync(
      PublicAccessType publicAccessType = PublicAccessType.None,
      IDictionary<string, string>? metadata = null,
      BlobContainerEncryptionScopeOptions? encryptionScopeOptions = null,
      CancellationToken cancellationToken = default)
    {
      operations.Add("blob-create");
      Access = publicAccessType;
      Token = cancellationToken;
      return Task.FromResult<Response<BlobContainerInfo>>(null!);
    }
  }

  private sealed class RecordingQueues(List<string> operations) : QueueServiceClient
  {
    internal RecordingQueue Queue { get; } = new(operations);
    public override QueueClient GetQueueClient(string name)
    {
      operations.Add($"queue:{name}");
      return Queue;
    }
  }

  private sealed class RecordingQueue(List<string> operations) : QueueClient
  {
    internal CancellationToken Token { get; private set; }
    public override Task<Response> CreateIfNotExistsAsync(
      IDictionary<string, string>? metadata = null, CancellationToken cancellationToken = default)
    {
      operations.Add("queue-create");
      Token = cancellationToken;
      return Task.FromResult<Response>(null!);
    }
  }
}
