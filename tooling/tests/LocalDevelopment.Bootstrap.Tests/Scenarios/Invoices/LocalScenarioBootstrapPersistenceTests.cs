namespace LocalDevelopment.Bootstrap.Tests.Scenarios.Invoices;

using System.Net;
using System.Text.Json;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Queues;
using global::LocalDevelopment.Bootstrap.Scenarios.Invoices;
using global::LocalDevelopment.Bootstrap.Scenarios.Invoices.Storage;
using global::LocalDevelopment.Tests;
using Microsoft.Azure.Cosmos;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Newtonsoft.Json.Linq;

/// <summary>Exercises the real initializer and adapters against explicitly owned, isolated emulators.</summary>
[TestClass]
[TestCategory("LocalDataIntegration")]
[DoNotParallelize]
public sealed class LocalScenarioBootstrapPersistenceTests
{
  private static readonly string ScenarioPath = Path.Combine(AppContext.BaseDirectory, "SeedData");
  private CosmosClient? cosmos;
  private BlobServiceClient? blobs;
  private QueueServiceClient? queues;

  /// <summary>Refuses real developer targets before clearing any isolated test data.</summary>
  [TestInitialize]
  public async Task InitializeAsync()
  {
    await LocalDataTestFixture.VerifyAsync(("cosmos", "8081/tcp", "18083"),
      ("storage", "10000/tcp", "19000"), ("storage", "10001/tcp", "19001"));
    cosmos = new CosmosClient(LocalDataTestFixture.CosmosConnectionString,
      new CosmosClientOptions { ConnectionMode = ConnectionMode.Gateway, LimitToEndpoint = true });
    blobs = new BlobServiceClient(LocalDataTestFixture.StorageConnectionString);
    queues = new QueueServiceClient(LocalDataTestFixture.StorageConnectionString);

    try { await cosmos.GetDatabase("primary").DeleteAsync(); }
    catch (CosmosException exception) when (exception.StatusCode == HttpStatusCode.NotFound) { }
    Database database = (await cosmos.CreateDatabaseAsync("primary")).Database;
    await database.CreateContainerAsync("invoices", "/UserIdentifier");
    await database.CreateContainerAsync("merchants", "/ParentCompanyId");
    await foreach (BlobContainerItem container in blobs.GetBlobContainersAsync())
    {
      await blobs.DeleteBlobContainerAsync(container.Name);
    }
    await blobs.GetBlobContainerClient("invoices").CreateIfNotExistsAsync(PublicAccessType.Blob);
    await foreach (Azure.Storage.Queues.Models.QueueItem queue in queues.GetQueuesAsync())
    {
      await queues.DeleteQueueAsync(queue.Name);
    }
    await queues.GetQueueClient("invoice-analysis").CreateIfNotExistsAsync();
  }

  /// <summary>Disposes the test-owned Cosmos connection without touching any developer resources.</summary>
  [TestCleanup]
  public void Cleanup() => cosmos?.Dispose();

  /// <summary>Starting initialization must not erase data already stored alongside the defaults.</summary>
  [TestMethod]
  public async Task RunAsync_ExistingData_PreservesDocumentsBlobsAndMessages()
  {
    CosmosClient client = cosmos ?? throw new InvalidOperationException();
    BlobServiceClient blobClient = blobs ?? throw new InvalidOperationException();
    QueueServiceClient queueClient = queues ?? throw new InvalidOperationException();
    Container invoices = client.GetContainer("primary", "invoices");
    var partition = new PartitionKey("custom-owner");
    await invoices.CreateItemAsync(new { id = "custom-invoice", UserIdentifier = "custom-owner", Name = "keep" }, partition);
    await blobClient.GetBlobContainerClient("invoices").GetBlobClient("custom.bin")
      .UploadAsync(BinaryData.FromString("keep"), overwrite: true);
    await queueClient.GetQueueClient("invoice-analysis").SendMessageAsync("keep-analysis");

    await CreateBootstrap(new DateOnly(2026, 11, 3)).RunAsync(ScenarioPath, CancellationToken.None);

    using ResponseMessage response = await invoices.ReadItemStreamAsync("custom-invoice", partition);
    Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
    Assert.IsTrue((await blobClient.GetBlobContainerClient("invoices").GetBlobClient("custom.bin").ExistsAsync()).Value);
    Assert.IsTrue((await queueClient.GetQueueClient("invoice-analysis").PeekMessagesAsync()).Value
      .Any(message => message.Body.ToString() == "keep-analysis"));
  }

  /// <summary>A completed initialization leaves edited and intentionally deleted seed records alone.</summary>
  [TestMethod]
  public async Task RunAsync_CompletedInitialization_PerformsNoSeedWrites()
  {
    CosmosClient client = cosmos ?? throw new InvalidOperationException();
    SeedScenarioManifest manifest = SeedData.LoadScenario(ScenarioPath);
    await CreateBootstrap(new DateOnly(2026, 11, 3)).RunAsync(ScenarioPath, CancellationToken.None);
    SeedInvoiceDefinition edited = manifest.Invoices.Single(invoice => invoice.Key == "invoice/alice-weekly-groceries");
    SeedInvoiceDefinition deleted = manifest.Invoices.Single(invoice => invoice.Key == "invoice/alice-riverside-topup");
    Guid owner = manifest.Personas.Single(persona => persona.Key == edited.OwnerKey).UserIdentifier;
    Container invoices = client.GetContainer("primary", "invoices");
    var partition = new PartitionKey(owner.ToString());
    JObject document = (await invoices.ReadItemAsync<JObject>(edited.Id.ToString(), partition)).Resource;
    document["Name"] = "my edited seed";
    await invoices.ReplaceItemAsync(document, edited.Id.ToString(), partition);
    await invoices.DeleteItemAsync<JObject>(deleted.Id.ToString(), partition);

    await CreateBootstrap(new DateOnly(2026, 11, 4)).RunAsync(ScenarioPath, CancellationToken.None);

    Assert.AreEqual("my edited seed",
      (await invoices.ReadItemAsync<JObject>(edited.Id.ToString(), partition)).Resource.Value<string>("Name"));
    using ResponseMessage missing = await invoices.ReadItemStreamAsync(deleted.Id.ToString(), partition);
    Assert.AreEqual(HttpStatusCode.NotFound, missing.StatusCode);
  }

  /// <summary>Resuming an incomplete receipt uses its original date, not the next startup's date.</summary>
  [TestMethod]
  public async Task RunAsync_IncompleteInitialization_ResumesWithPersistedAnchor()
  {
    CosmosClient client = cosmos ?? throw new InvalidOperationException();
    Database database = client.GetDatabase("primary");
    Container state = (await database.CreateContainerAsync("local-development", "/id")).Container;
    await state.CreateItemAsync(new
    {
      id = "invoice-scenario",
      manifestVersion = "v3",
      anchorDateUtc = "2026-11-03",
      completed = false,
    }, new PartitionKey("invoice-scenario"));

    await CreateBootstrap(new DateOnly(2026, 11, 4)).RunAsync(ScenarioPath, CancellationToken.None);

    SeedScenarioManifest manifest = SeedData.LoadScenario(ScenarioPath);
    SeedInvoiceDefinition invoice = manifest.Invoices.Single(definition => definition.Key == "invoice/alice-weekly-groceries");
    Guid owner = manifest.Personas.Single(persona => persona.Key == invoice.OwnerKey).UserIdentifier;
    JObject document = (await database.GetContainer("invoices")
      .ReadItemAsync<JObject>(invoice.Id.ToString(), new PartitionKey(owner.ToString()))).Resource;
    Assert.AreEqual(new DateTimeOffset(new DateOnly(2026, 11, 3).AddDays(-invoice.DaysAgo),
      invoice.TransactionTimeUtc, TimeSpan.Zero).UtcDateTime, document.Value<DateTime>("CreatedAt").ToUniversalTime());
  }

  /// <summary>A different fixture version requires an explicit reset instead of silently rewriting data.</summary>
  [TestMethod]
  [DataRow("v1")]
  [DataRow("v2")]
  public async Task RunAsync_ManifestVersionChanged_RefusesMutation(string legacyVersion)
  {
    CosmosClient client = cosmos ?? throw new InvalidOperationException();
    Container state = (await client.GetDatabase("primary").CreateContainerAsync("local-development", "/id")).Container;
    await state.CreateItemAsync(new
    {
      id = "invoice-scenario",
      manifestVersion = legacyVersion,
      anchorDateUtc = "2026-11-03",
      completed = true,
    }, new PartitionKey("invoice-scenario"));
    Container invoices = client.GetContainer("primary", "invoices");
    await invoices.CreateItemAsync(new { id = "legacy-custom", UserIdentifier = "custom-owner", Name = "preserve" },
      new PartitionKey("custom-owner"));

    await Assert.ThrowsExactlyAsync<InvalidOperationException>(() =>
      CreateBootstrap(new DateOnly(2026, 11, 4)).RunAsync(ScenarioPath, CancellationToken.None));

    JObject receipt = (await state.ReadItemAsync<JObject>("invoice-scenario", new PartitionKey("invoice-scenario"))).Resource;
    Assert.AreEqual(legacyVersion, receipt.Value<string>("manifestVersion"));
    Assert.IsTrue(receipt.Value<bool>("completed"));
    using FeedIterator<JObject> iterator = invoices.GetItemQueryIterator<JObject>("SELECT * FROM c");
    var records = new List<JObject>();
    while (iterator.HasMoreResults) { records.AddRange(await iterator.ReadNextAsync()); }
    Assert.HasCount(1, records);
    Assert.AreEqual("legacy-custom", records[0].Value<string>("id"));
  }

  /// <summary>Expanded enrichment survives the same raw SDK domain deserialization used by the API.</summary>
  [TestMethod]
  public async Task RunAsync_ExpandedScenario_RoundTripsThroughApiDomainContracts()
  {
    CosmosClient client = cosmos ?? throw new InvalidOperationException();
    DateOnly anchor = new(2026, 11, 4);
    MaterializedSeedScenario expected = SeedData.Materialize(SeedData.LoadScenario(ScenarioPath), anchor);
    await CreateBootstrap(anchor).RunAsync(ScenarioPath, CancellationToken.None);
    var invoices = new List<Invoice>();
    var merchants = new List<Merchant>();
    using (FeedIterator<Invoice> iterator = client.GetContainer("primary", "invoices").GetItemQueryIterator<Invoice>("SELECT * FROM c"))
    {
      while (iterator.HasMoreResults) { invoices.AddRange(await iterator.ReadNextAsync()); }
    }
    using (FeedIterator<Merchant> iterator = client.GetContainer("primary", "merchants").GetItemQueryIterator<Merchant>("SELECT * FROM c"))
    {
      while (iterator.HasMoreResults) { merchants.AddRange(await iterator.ReadNextAsync()); }
    }

    Assert.HasCount(1326, invoices);
    Assert.HasCount(361, merchants);
    Assert.AreEqual(18000, invoices.Where(invoice =>
      invoice.UserIdentifier == PersonaIds.Dmitryi && !invoice.IsSoftDeleted).Sum(invoice => invoice.Items.Count));
    var byId = invoices.ToDictionary(invoice => invoice.id);
    foreach (Invoice original in expected.Invoices)
    {
      Invoice actual = byId[original.id];
      Assert.AreEqual(original.UserIdentifier, actual.UserIdentifier);
      Assert.AreEqual(original.MerchantReference, actual.MerchantReference);
      CollectionAssert.AreEqual(original.Items.Select(product => (product.Quantity, product.Price)).ToArray(),
        actual.Items.Select(product => (product.Quantity, product.Price)).ToArray());
      AssertEquivalent(original.Items, actual.Items, original.Name);
      AssertEquivalent(original.Classification, actual.Classification, original.Name);
      AssertEquivalent(original.PossibleRecipes, actual.PossibleRecipes, original.Name);
      AssertEquivalent(original.PaymentInformation, actual.PaymentInformation, original.Name);
      AssertEquivalent(original.TaxDetails, actual.TaxDetails, original.Name);
    }

    var merchantIds = merchants.ToDictionary(merchant => merchant.id);
    foreach (Merchant original in expected.Merchants)
    {
      Merchant actual = merchantIds[original.id];
      Assert.AreEqual(original.CreatedBy, actual.CreatedBy);
      Assert.AreEqual(original.Address, actual.Address);
      Assert.AreEqual(original.Classification, actual.Classification);
      CollectionAssert.AreEquivalent(original.ReferencedInvoices.ToArray(), actual.ReferencedInvoices.ToArray());
    }
  }

  /// <summary>First-use seeding must not overwrite an existing seed scan or its headers.</summary>
  [TestMethod]
  public async Task RunAsync_ExistingSeedBlob_PreservesBytesAndHeaders()
  {
    BlobServiceClient client = blobs ?? throw new InvalidOperationException();
    string key = SeedData.LoadScenario(ScenarioPath).Blobs[0].Key;
    BlobClient blob = client.GetBlobContainerClient("invoices").GetBlobClient($"seed/{key}.png");
    using var content = new MemoryStream([1, 2, 3]);
    await blob.UploadAsync(content, new BlobUploadOptions
    {
      HttpHeaders = new BlobHttpHeaders { ContentType = "application/custom-scan" },
    });

    await CreateBootstrap(new DateOnly(2026, 11, 3)).RunAsync(ScenarioPath, CancellationToken.None);

    CollectionAssert.AreEqual(new byte[] { 1, 2, 3 }, (await blob.DownloadContentAsync()).Value.Content.ToArray());
    Assert.AreEqual("application/custom-scan", (await blob.GetPropertiesAsync()).Value.ContentType);
  }

  /// <summary>An unrelated unique-key conflict is not mistaken for an already seeded item.</summary>
  [TestMethod]
  public async Task RunAsync_UnexpectedItemConflict_PropagatesConflict()
  {
    CosmosClient client = cosmos ?? throw new InvalidOperationException();
    SeedScenarioManifest manifest = SeedData.LoadScenario(ScenarioPath);
    SeedInvoiceDefinition seed = manifest.Invoices[0];
    Guid owner = manifest.Personas.Single(persona => persona.Key == seed.OwnerKey).UserIdentifier;
    Database database = client.GetDatabase("primary");
    await database.GetContainer("invoices").DeleteContainerAsync();
    var properties = new ContainerProperties("invoices", "/UserIdentifier")
    {
      UniqueKeyPolicy = new UniqueKeyPolicy
      {
        UniqueKeys = { new UniqueKey { Paths = { "/Name" } } },
      },
    };
    Container invoices = (await database.CreateContainerAsync(properties)).Container;
    await invoices.CreateItemAsync(new { id = "conflicting-custom-item", UserIdentifier = owner.ToString(), seed.Name },
      new PartitionKey(owner.ToString()));

    CosmosException failure = await Assert.ThrowsExactlyAsync<CosmosException>(() =>
      CreateBootstrap(new DateOnly(2026, 11, 3)).RunAsync(ScenarioPath, CancellationToken.None));

    Assert.AreEqual(HttpStatusCode.Conflict, failure.StatusCode);
  }

  /// <summary>Two initializers that both observe a missing receipt must adopt the same winning date.</summary>
  [TestMethod]
  public async Task ReadOrCreateInitialization_ConcurrentCreators_ReturnSameAnchor()
  {
    CosmosClient client = cosmos ?? throw new InvalidOperationException();
    await client.GetDatabase("primary").CreateContainerAsync("local-development", "/id");
    var barrier = new InitializationReadBarrier();
    var firstOptions = new CosmosClientOptions { ConnectionMode = ConnectionMode.Gateway, LimitToEndpoint = true };
    firstOptions.CustomHandlers.Add(new InitializationReadHandler(barrier));
    var secondOptions = new CosmosClientOptions { ConnectionMode = ConnectionMode.Gateway, LimitToEndpoint = true };
    secondOptions.CustomHandlers.Add(new InitializationReadHandler(barrier));
    using var first = new CosmosClient(LocalDataTestFixture.CosmosConnectionString, firstOptions);
    using var second = new CosmosClient(LocalDataTestFixture.CosmosConnectionString, secondOptions);
    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));

    SeedInitializationState[] states = await Task.WhenAll(
      new LocalCosmosResetter(first).ReadOrCreateInitializationAsync("v1", new DateOnly(2026, 11, 3), timeout.Token),
      new LocalCosmosResetter(second).ReadOrCreateInitializationAsync("v1", new DateOnly(2026, 11, 4), timeout.Token));

    Assert.AreEqual(2, barrier.Arrivals);
    Assert.AreEqual(states[0].AnchorDateUtc, states[1].AnchorDateUtc);
    Assert.IsTrue(states[0].AnchorDateUtc is { Year: 2026, Month: 11, Day: 3 or 4 });
  }

  private static void AssertEquivalent<T>(T expected, T actual, string label) =>
    Assert.IsTrue(JsonElement.DeepEquals(JsonSerializer.SerializeToElement(expected), JsonSerializer.SerializeToElement(actual)), label);

  private LocalScenarioBootstrap CreateBootstrap(DateOnly date) => new(
    new LocalCosmosResetter(cosmos ?? throw new InvalidOperationException()),
    new LocalAzuriteResetter(blobs ?? throw new InvalidOperationException(), queues ?? throw new InvalidOperationException()),
    new FixedTimeProvider(new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero)));

  private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
  {
    public override DateTimeOffset GetUtcNow() => now;
  }

  private sealed class InitializationReadBarrier
  {
    private readonly TaskCompletionSource released = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private int arrivals;
    internal int Arrivals => Volatile.Read(ref arrivals);

    internal async Task ArriveAsync(CancellationToken cancellationToken)
    {
      if (Interlocked.Increment(ref arrivals) == 2) { released.TrySetResult(); }
      await released.Task.WaitAsync(cancellationToken);
    }
  }

  private sealed class InitializationReadHandler(InitializationReadBarrier barrier) : RequestHandler
  {
    public override async Task<ResponseMessage> SendAsync(RequestMessage request, CancellationToken cancellationToken)
    {
      ResponseMessage response = await base.SendAsync(request, cancellationToken);
      if (response.StatusCode == HttpStatusCode.NotFound && request.Method == HttpMethod.Get
        && request.RequestUri.OriginalString.EndsWith("/docs/invoice-scenario", StringComparison.Ordinal))
      {
        await barrier.ArriveAsync(cancellationToken);
      }
      return response;
    }
  }
}
