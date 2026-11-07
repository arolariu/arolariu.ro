namespace LocalDevelopment.Data.Tests.Scenarios.Invoices;

using Azure.Core.Pipeline;
using Azure.Storage.Blobs;
using Azure.Storage.Queues;
using global::LocalDevelopment.Data.Scenarios.Invoices;
using Microsoft.Azure.Cosmos;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies the public initialization boundary validates fixtures before accessing a provider.</summary>
[TestClass]
public sealed class InvoiceScenarioInitializerTests
{
  /// <summary>A partially packaged scenario cannot create receipts or seed data.</summary>
  [TestMethod]
  public async Task InitializeAsync_MalformedBundle_DoesNotCallSdk()
  {
    using var files = new SeedScenarioDirectory();
    files.Remove("dmitryi");
    using var handler = new RejectingTransport();
    using var http = new HttpClient(handler);
    using var cosmos = new RejectingCosmos();
    var blobs = new BlobServiceClient("UseDevelopmentStorage=true",
      new BlobClientOptions { Transport = new HttpClientTransport(http) });
    var queues = new QueueServiceClient("UseDevelopmentStorage=true",
      new QueueClientOptions { Transport = new HttpClientTransport(http) });
    var initializer = new InvoiceScenarioInitializer(cosmos, blobs, queues, TimeProvider.System, TextWriter.Null);

    await Assert.ThrowsExactlyAsync<InvalidDataException>(() =>
      initializer.InitializeAsync(files.Path, CancellationToken.None));

    Assert.AreEqual(0, handler.RequestCount + cosmos.RequestCount);
  }

  private sealed class RejectingCosmos : CosmosClient
  {
    internal int RequestCount { get; private set; }

    protected override void Dispose(bool disposing) { }

    public override Task<DatabaseResponse> CreateDatabaseIfNotExistsAsync(
      string id, int? throughput = null, RequestOptions? requestOptions = null,
      CancellationToken cancellationToken = default)
    {
      RequestCount++;
      throw new InvalidOperationException("Invalid fixture input must not reach Cosmos.");
    }
  }

  private sealed class RejectingTransport : HttpMessageHandler
  {
    internal int RequestCount { get; private set; }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
      RequestCount++;
      throw new InvalidOperationException("Invalid fixture input must not reach a provider.");
    }
  }
}
