namespace arolariu.Backend.Domain.Tests.Invoices.Brokers.AnalysisRunBroker;

using System;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.AnalysisRunBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Azure.Cosmos;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for <see cref="CosmosAnalysisRunBroker"/>, the direct (non-EF) Cosmos DB SDK broker backing the
/// <c>analysisRuns</c> container. Mocks <see cref="CosmosClient"/>/<see cref="Database"/>/<see cref="Container"/>
/// and, where needed, <see cref="FeedIterator{T}"/>, following the established pattern used by
/// <c>InvoiceNoSqlBrokerTests.Base.cs</c> / <c>InvoiceNoSqlBrokerExceptionTranslationTests.cs</c>. This is the true
/// external Cosmos boundary for this broker, so no repository-service mocking is involved.
/// </summary>
[TestClass]
public sealed class CosmosAnalysisRunBrokerTests
{
  private const string ContainerId = "analysisRuns";

  private readonly Mock<CosmosClient> mockCosmosClient;
  private readonly Mock<Database> mockDatabase;
  private readonly Mock<Container> mockContainer;
  private readonly CosmosAnalysisRunBroker broker;

  /// <summary>Initializes the mocked Cosmos client/database/container chain and the broker under test.</summary>
  public CosmosAnalysisRunBrokerTests()
  {
    mockCosmosClient = new Mock<CosmosClient>();
    mockDatabase = new Mock<Database>();
    mockContainer = new Mock<Container>();

    mockCosmosClient.Setup(client => client.GetDatabase(It.IsAny<string>())).Returns(mockDatabase.Object);
    mockDatabase.Setup(db => db.GetContainer(ContainerId)).Returns(mockContainer.Object);

    broker = new CosmosAnalysisRunBroker(mockCosmosClient.Object);
  }

  private static CosmosException MakeCosmosException(HttpStatusCode statusCode) =>
    new("cosmos failure", statusCode, 0, "activity", 0);

  #region EnsureContainerAsync Tests

  /// <summary>
  /// Verifies that when the container already exists with the desired default TTL (<c>-1</c>), the broker does
  /// NOT issue a redundant <see cref="Container.ReplaceContainerAsync"/> call.
  /// </summary>
  [TestMethod]
  public async Task EnsureContainerAsync_ContainerAlreadyHasNegativeOneTtl_DoesNotCallReplaceContainer()
  {
    var properties = new ContainerProperties(ContainerId, "/bucket") { DefaultTimeToLive = -1 };
    var containerResponseMock = new Mock<ContainerResponse>();
    containerResponseMock.Setup(r => r.Resource).Returns(properties);
    containerResponseMock.Setup(r => r.Container).Returns(mockContainer.Object);

    mockDatabase
      .Setup(db => db.CreateContainerIfNotExistsAsync(
        It.IsAny<ContainerProperties>(), It.IsAny<int?>(), It.IsAny<RequestOptions>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(containerResponseMock.Object);

    await broker.EnsureContainerAsync(CancellationToken.None).ConfigureAwait(true);

    mockContainer.Verify(
      c => c.ReplaceContainerAsync(It.IsAny<ContainerProperties>(), It.IsAny<ContainerRequestOptions>(), It.IsAny<CancellationToken>()),
      Times.Never);
  }

  /// <summary>
  /// Verifies that when an already-existing container reports a default TTL other than <c>-1</c> (e.g. a container
  /// provisioned before this design, or restored from a backup with a finite TTL), the broker patches it via
  /// <see cref="Container.ReplaceContainerAsync"/> so item-level TTL is honored consistently in every environment.
  /// </summary>
  [TestMethod]
  public async Task EnsureContainerAsync_ExistingContainerHasFiniteTtl_CallsReplaceContainerAsync()
  {
    var properties = new ContainerProperties(ContainerId, "/bucket") { DefaultTimeToLive = 3600 };
    var containerResponseMock = new Mock<ContainerResponse>();
    containerResponseMock.Setup(r => r.Resource).Returns(properties);
    containerResponseMock.Setup(r => r.Container).Returns(mockContainer.Object);

    mockDatabase
      .Setup(db => db.CreateContainerIfNotExistsAsync(
        It.IsAny<ContainerProperties>(), It.IsAny<int?>(), It.IsAny<RequestOptions>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(containerResponseMock.Object);

    var replacedResponseMock = new Mock<ContainerResponse>();
    replacedResponseMock.Setup(r => r.Resource).Returns(new ContainerProperties(ContainerId, "/bucket") { DefaultTimeToLive = -1 });
    mockContainer
      .Setup(c => c.ReplaceContainerAsync(
        It.Is<ContainerProperties>(p => p.DefaultTimeToLive == -1), It.IsAny<ContainerRequestOptions>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(replacedResponseMock.Object);

    await broker.EnsureContainerAsync(CancellationToken.None).ConfigureAwait(true);

    mockContainer.Verify(
      c => c.ReplaceContainerAsync(
        It.Is<ContainerProperties>(p => p.DefaultTimeToLive == -1), It.IsAny<ContainerRequestOptions>(), It.IsAny<CancellationToken>()),
      Times.Once);
  }

  #endregion

  #region ClaimNextAsync Tests

  /// <summary>
  /// Verifies that when the oldest claimable candidate loses the optimistic-concurrency race (its conditional
  /// <see cref="Container.ReplaceItemAsync"/> returns HTTP 412 Precondition Failed), <see cref="CosmosAnalysisRunBroker.ClaimNextAsync"/>
  /// does NOT surface the race as a failure — it moves on and successfully claims the next-oldest candidate instead.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextAsync_FirstCandidateReplaceReturns412_SkipsToNextCandidate()
  {
    var firstCandidate = AnalysisRunTestBuilder.Queued().WithETag("\"etag-first\"");
    var secondCandidate = AnalysisRunTestBuilder.Queued().WithETag("\"etag-second\"");

    var feedResponseMock = new Mock<FeedResponse<AnalysisRun>>();
    feedResponseMock.Setup(r => r.GetEnumerator())
      .Returns(new System.Collections.Generic.List<AnalysisRun> { firstCandidate, secondCandidate }.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<AnalysisRun>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockContainer
      .Setup(c => c.GetItemQueryIterator<AnalysisRun>(It.IsAny<QueryDefinition>(), It.IsAny<string>(), It.IsAny<QueryRequestOptions>()))
      .Returns(mockFeedIterator.Object);

    mockContainer
      .Setup(c => c.ReplaceItemAsync(
        It.IsAny<AnalysisRun>(), firstCandidate.Id.ToString(), It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.PreconditionFailed));

    var claimedSecond = secondCandidate.Claim("worker-b", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5)).WithETag("\"etag-second-claimed\"");
    var replaceResponseMock = new Mock<ItemResponse<AnalysisRun>>();
    replaceResponseMock.Setup(r => r.Resource).Returns(claimedSecond);
    replaceResponseMock.Setup(r => r.ETag).Returns("\"etag-second-claimed\"");
    replaceResponseMock.Setup(r => r.RequestCharge).Returns(5.0);
    mockContainer
      .Setup(c => c.ReplaceItemAsync(
        It.IsAny<AnalysisRun>(), secondCandidate.Id.ToString(), It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(replaceResponseMock.Object);

    var result = await broker.ClaimNextAsync("worker-b", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None).ConfigureAwait(true);

    Assert.IsNotNull(result);
    Assert.AreEqual(secondCandidate.Id, result!.Id);
    Assert.AreEqual("\"etag-second-claimed\"", result.ETag);
    mockContainer.Verify(
      c => c.ReplaceItemAsync(
        It.IsAny<AnalysisRun>(), firstCandidate.Id.ToString(), It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()),
      Times.Once);
    mockContainer.Verify(
      c => c.ReplaceItemAsync(
        It.IsAny<AnalysisRun>(), secondCandidate.Id.ToString(), It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()),
      Times.Once);
  }

  #endregion

  #region Cosmos Exception Translation Tests

  /// <summary>
  /// Verifies that a Cosmos 404 (NotFound) surfaced while replacing a run (e.g. the run was deleted concurrently)
  /// is translated into <see cref="AnalysisRunNotFoundException"/> rather than propagating the raw <see cref="CosmosException"/>.
  /// </summary>
  [TestMethod]
  public async Task ReplaceAsync_WhenCosmos404_ThrowsAnalysisRunNotFoundException()
  {
    var run = AnalysisRunTestBuilder.Queued();
    mockContainer
      .Setup(c => c.ReplaceItemAsync(run, run.Id.ToString(), It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.NotFound));

    await Assert.ThrowsExactlyAsync<AnalysisRunNotFoundException>(
      () => broker.ReplaceAsync(run, "\"etag-1\"", CancellationToken.None).AsTask()).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that a Cosmos 412 (PreconditionFailed) surfaced by a direct <see cref="CosmosAnalysisRunBroker.ReplaceAsync"/>
  /// call (outside the internal claim-skip loop) is translated into <see cref="AnalysisRunLeaseConflictException"/>.
  /// </summary>
  [TestMethod]
  public async Task ReplaceAsync_WhenCosmos412_ThrowsAnalysisRunLeaseConflictException()
  {
    var run = AnalysisRunTestBuilder.Queued();
    mockContainer
      .Setup(c => c.ReplaceItemAsync(run, run.Id.ToString(), It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.PreconditionFailed));

    await Assert.ThrowsExactlyAsync<AnalysisRunLeaseConflictException>(
      () => broker.ReplaceAsync(run, "\"etag-1\"", CancellationToken.None).AsTask()).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that a Cosmos 429 (TooManyRequests) surfaced by <see cref="CosmosAnalysisRunBroker.ReplaceAsync"/> is
  /// translated into <see cref="AnalysisRunCosmosDbRateLimitException"/> (HTTP 429 preserved end-to-end, not
  /// collapsed into a generic dependency/503 outcome), defaulting the retry-after hint to one second when Cosmos
  /// does not supply a concrete value (as is the case for a locally-constructed <see cref="CosmosException"/>).
  /// </summary>
  [TestMethod]
  public async Task ReplaceAsync_WhenCosmos429_ThrowsAnalysisRunCosmosDbRateLimitExceptionWithRetryAfter()
  {
    var run = AnalysisRunTestBuilder.Queued();
    mockContainer
      .Setup(c => c.ReplaceItemAsync(run, run.Id.ToString(), It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.TooManyRequests));

    var exception = await Assert.ThrowsExactlyAsync<AnalysisRunCosmosDbRateLimitException>(
      () => broker.ReplaceAsync(run, "\"etag-1\"", CancellationToken.None).AsTask()).ConfigureAwait(true);

    Assert.AreEqual(TimeSpan.FromSeconds(1), exception.RetryAfter);
    Assert.IsInstanceOfType<CosmosException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that a Cosmos 429 (TooManyRequests) surfaced by <see cref="CosmosAnalysisRunBroker.CreateAsync"/> is
  /// also translated into <see cref="AnalysisRunCosmosDbRateLimitException"/>, confirming the translation is applied
  /// uniformly across every broker operation and not only the claim/replace path.
  /// </summary>
  [TestMethod]
  public async Task CreateAsync_WhenCosmos429_ThrowsAnalysisRunCosmosDbRateLimitException()
  {
    var run = AnalysisRunTestBuilder.Queued();
    mockContainer
      .Setup(c => c.CreateItemAsync(run, It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.TooManyRequests));

    await Assert.ThrowsExactlyAsync<AnalysisRunCosmosDbRateLimitException>(
      () => broker.CreateAsync(run, CancellationToken.None).AsTask()).ConfigureAwait(true);
  }

  #endregion
}
