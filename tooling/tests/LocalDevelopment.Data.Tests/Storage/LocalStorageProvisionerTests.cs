namespace LocalDevelopment.Data.Tests.Storage;

using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Queues;
using global::LocalDevelopment.Data.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies create-only and startup provisioning at the SDK boundary.</summary>
[TestClass]
public sealed class LocalStorageProvisionerTests
{
  /// <summary>Verifies storage-only calls create only, preserving names, access and tokens.</summary>
  [TestMethod]
  public async Task EnsureStorageAsync_StorageOnly_CreatesWithoutResetting()
  {
    using var source = new CancellationTokenSource();
    var operations = new List<string>();
    var blobs = new RecordingBlobs(operations);
    var queues = new RecordingQueues(operations);
    await new LocalStorageProvisioner(blobs, queues).EnsureStorageAsync(source.Token);
    CollectionAssert.AreEqual(new[] { "blob:invoices", "blob-create", "queue:invoice-analysis", "queue-create" }, operations);
    Assert.AreEqual(PublicAccessType.Blob, blobs.Container.Access);
    Assert.AreEqual(source.Token, blobs.Container.Token);
    Assert.AreEqual(source.Token, queues.Queue.Token);
    Assert.AreEqual(0, blobs.CorsWrites);
    Assert.AreEqual(0, blobs.Container.PolicyWrites);
  }

  /// <summary>Startup upgrades an existing container but does not redundantly rewrite new containers.</summary>
  [TestMethod]
  [DataRow(false)]
  [DataRow(true)]
  public async Task EnsureStartupContainerAsync_CreationResult_PreservesAccessPolicy(bool created)
  {
    using var source = new CancellationTokenSource();
    var operations = new List<string>();
    var blobs = new RecordingBlobs(operations);
    blobs.Container.Created = created;
    var provisioner = new LocalStorageProvisioner(blobs, new RecordingQueues(operations));

    Assert.AreEqual(created, await provisioner.EnsureStartupContainerAsync("invoices", source.Token));

    Assert.AreEqual(created ? 0 : 1, blobs.Container.PolicyWrites);
    Assert.AreEqual(PublicAccessType.Blob, blobs.Container.Access);
    Assert.AreEqual(source.Token, blobs.Container.Token);
  }

  /// <summary>Startup replaces CORS while leaving other service properties intact.</summary>
  [TestMethod]
  public async Task ApplyStartupCorsAsync_ExistingProperties_ReplacesOnlyCors()
  {
    using var source = new CancellationTokenSource();
    var operations = new List<string>();
    var blobs = new RecordingBlobs(operations);
    blobs.Properties.Cors.Add(new BlobCorsRule { AllowedOrigins = "old" });
    blobs.Properties.DefaultServiceVersion = "2021-12-02";

    await new LocalStorageProvisioner(blobs, new RecordingQueues(operations)).ApplyStartupCorsAsync(source.Token);

    Assert.AreEqual(1, blobs.CorsWrites);
    Assert.AreEqual(source.Token, blobs.Token);
    Assert.AreEqual("2021-12-02", blobs.Properties.DefaultServiceVersion);
    Assert.HasCount(1, blobs.Properties.Cors);
    BlobCorsRule rule = blobs.Properties.Cors[0];
    Assert.AreEqual("*", rule.AllowedOrigins);
    Assert.AreEqual("GET,PUT,POST,DELETE,HEAD,OPTIONS,MERGE", rule.AllowedMethods);
    Assert.AreEqual("*", rule.AllowedHeaders);
    Assert.AreEqual("*", rule.ExposedHeaders);
    Assert.AreEqual(3600, rule.MaxAgeInSeconds);
    CollectionAssert.AreEqual(new[] { "properties-get", "properties-set" }, operations);
  }

  private sealed class RecordingBlobs(List<string> operations) : BlobServiceClient
  {
    internal BlobServiceProperties Properties { get; } = new() { Cors = [] };
    internal int CorsWrites { get; private set; }
    internal CancellationToken Token { get; private set; }
    internal RecordingContainer Container { get; } = new(operations);
    public override Task<Response<BlobServiceProperties>> GetPropertiesAsync(CancellationToken cancellationToken = default)
    {
      operations.Add("properties-get");
      Token = cancellationToken;
      return Task.FromResult(Response.FromValue(Properties, null!));
    }

    public override Task<Response> SetPropertiesAsync(BlobServiceProperties properties, CancellationToken cancellationToken = default)
    {
      operations.Add("properties-set");
      Assert.AreSame(Properties, properties);
      Token = cancellationToken;
      CorsWrites++;
      return Task.FromResult<Response>(null!);
    }

    public override BlobContainerClient GetBlobContainerClient(string name)
    {
      operations.Add($"blob:{name}");
      return Container;
    }
  }

  private sealed class RecordingContainer(List<string> operations) : BlobContainerClient
  {
    internal bool Created { get; set; }
    internal int PolicyWrites { get; private set; }
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
      return Task.FromResult(Created
        ? Response.FromValue(BlobsModelFactory.BlobContainerInfo(new ETag("created"), DateTimeOffset.UnixEpoch), null!)
        : null!);
    }

    public override Task<Response<BlobContainerInfo>> SetAccessPolicyAsync(
      PublicAccessType accessType = PublicAccessType.None, IEnumerable<BlobSignedIdentifier>? permissions = null,
      BlobRequestConditions? conditions = null, CancellationToken cancellationToken = default)
    {
      operations.Add("blob-policy");
      Access = accessType;
      Token = cancellationToken;
      PolicyWrites++;
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
