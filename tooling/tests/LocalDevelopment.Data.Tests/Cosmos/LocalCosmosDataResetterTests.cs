namespace LocalDevelopment.Data.Tests.Cosmos;

using System.Net;
using System.Text.Json;
using global::LocalDevelopment.Data.Cosmos;
using global::LocalDevelopment.Tests;
using Microsoft.Azure.Cosmos;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies database-wide reset through real SDK deletes and controlled feed pagination.</summary>
[TestClass]
[TestCategory("LocalDataIntegration")]
[DoNotParallelize]
public sealed class LocalCosmosDataResetterTests
{
  private CosmosClient? client;

  /// <summary>Restricts cleanup to the explicitly owned emulator fixture.</summary>
  [TestInitialize]
  public async Task InitializeAsync()
  {
    await LocalDataTestFixture.VerifyAsync(("cosmos", "8081/tcp", "18083"));
    client = new CosmosClient(LocalDataTestFixture.CosmosConnectionString,
      new CosmosClientOptions { ConnectionMode = ConnectionMode.Gateway, LimitToEndpoint = true });
    using FeedIterator<DatabaseProperties> databases = client.GetDatabaseQueryIterator<DatabaseProperties>();
    var names = new List<string>();
    while (databases.HasMoreResults) { names.AddRange((await databases.ReadNextAsync()).Select(database => database.Id)); }
    foreach (string name in names) { await client.GetDatabase(name).DeleteAsync(); }
    foreach (string name in new[] { "primary", "custom-data", "another-custom" }) { await client.CreateDatabaseAsync(name); }
  }

  /// <summary>Releases only this test's SDK client.</summary>
  [TestCleanup]
  public void Cleanup() => client?.Dispose();

  /// <summary>Deleting only primary or the first database page would leave custom data behind.</summary>
  [TestMethod]
  public async Task ClearAsync_MultiplePages_RemovesEveryUserResource()
  {
    var handler = new DatabasePagesHandler();
    var options = new CosmosClientOptions { ConnectionMode = ConnectionMode.Gateway, LimitToEndpoint = true };
    options.CustomHandlers.Add(handler);
    using var paginated = new CosmosClient(LocalDataTestFixture.CosmosConnectionString, options);

    await new LocalCosmosDataResetter(paginated).ClearAsync(CancellationToken.None);

    using FeedIterator<DatabaseProperties> remaining = (client ?? throw new InvalidOperationException())
      .GetDatabaseQueryIterator<DatabaseProperties>();
    var names = new List<string>();
    while (remaining.HasMoreResults) { names.AddRange((await remaining.ReadNextAsync()).Select(database => database.Id)); }
    Assert.HasCount(0, names);
    Assert.AreEqual(2, handler.PagesRead);
  }

  /// <summary>After a clear, native prerequisite names and partition contracts must be recreated explicitly.</summary>
  [TestMethod]
  public async Task EnsureScenarioContainersAsync_AfterClear_RestoresPartitionContracts()
  {
    CosmosClient active = client ?? throw new InvalidOperationException();
    var resetter = new LocalCosmosDataResetter(active);
    await resetter.ClearAsync(CancellationToken.None);

    await resetter.EnsureScenarioContainersAsync(CancellationToken.None);

    Assert.AreEqual("/UserIdentifier",
      (await active.GetContainer("primary", "invoices").ReadContainerAsync()).Resource.PartitionKeyPath);
    Assert.AreEqual("/ParentCompanyId",
      (await active.GetContainer("primary", "merchants").ReadContainerAsync()).Resource.PartitionKeyPath);
    using ResponseMessage deleted = await active.GetDatabase("custom-data").ReadStreamAsync();
    Assert.AreEqual(HttpStatusCode.NotFound, deleted.StatusCode);
  }

  private sealed class DatabasePagesHandler : RequestHandler
  {
    internal int PagesRead { get; private set; }

    public override Task<ResponseMessage> SendAsync(RequestMessage request, CancellationToken cancellationToken)
    {
      string path = request.RequestUri.IsAbsoluteUri ? request.RequestUri.AbsolutePath : request.RequestUri.OriginalString;
      if (request.Method != HttpMethod.Get || path.Trim('/') != "dbs")
      {
        return base.SendAsync(request, cancellationToken);
      }
      PagesRead++;
      Assert.IsTrue(PagesRead <= 2, "The database feed repeated a page instead of forwarding its continuation token.");
      bool first = string.IsNullOrEmpty(request.Headers.ContinuationToken);
      string[] names = first ? ["primary"] : ["custom-data", "another-custom"];
      var response = new ResponseMessage(HttpStatusCode.OK)
      {
        Content = new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(
          new { Databases = names.Select(id => new { id }).ToArray(), _count = names.Length })),
      };
      if (first) { response.Headers.Add("x-ms-continuation", "page-two"); }
      return Task.FromResult(response);
    }
  }
}
