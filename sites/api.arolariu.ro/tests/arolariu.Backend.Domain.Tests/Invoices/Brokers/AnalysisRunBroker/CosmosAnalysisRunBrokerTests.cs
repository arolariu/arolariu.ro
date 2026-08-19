namespace arolariu.Backend.Domain.Tests.Invoices.Brokers.DatabaseBroker;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Linq.Expressions;
using System.Net;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for <see cref="CosmosDatabaseBroker"/>, the direct (non-EF) Cosmos DB SDK broker backing the
/// <c>analysisRuns</c> container. Mocks <see cref="CosmosClient"/>/<see cref="Database"/>/<see cref="Container"/>
/// and, where needed, <see cref="FeedIterator{T}"/>, following the established pattern used by
/// <c>CosmosDatabaseBrokerTests.Base.cs</c> / <c>CosmosDatabaseBrokerExceptionTranslationTests.cs</c>. This is the true
/// external Cosmos boundary for this broker, so no repository-service mocking is involved.
/// </summary>
[TestClass]
[DoNotParallelize]
public sealed class CosmosDatabaseBrokerTests : IDisposable
{
  private const string ContainerId = "analysisRuns";
  private const string RequestChargeInstrument = "invoices.cosmosdb.request_charge";
  private const string OperationTag = "db.operation";
  private const string ContainerTag = "db.cosmosdb.container";

  private readonly Mock<CosmosClient> mockCosmosClient;
  private readonly Mock<Database> mockDatabase;
  private readonly Mock<Container> mockContainer;
  private readonly CosmosDatabaseBroker broker;

  /// <summary>Initializes the mocked Cosmos client/database/container chain and the broker under test.</summary>
  public CosmosDatabaseBrokerTests()
  {
    mockCosmosClient = new Mock<CosmosClient>();
    mockDatabase = new Mock<Database>();
    mockContainer = new Mock<Container>();

    mockCosmosClient.Setup(client => client.GetDatabase(It.IsAny<string>())).Returns(mockDatabase.Object);
    mockDatabase.Setup(db => db.GetContainer(ContainerId)).Returns(mockContainer.Object);

    var options = new DbContextOptionsBuilder<CosmosDatabaseBroker>()
      .UseCosmos(
        "AccountEndpoint=https://localhost:8081/;AccountKey=local-test-key;",
        "primary")
      .Options;
    broker = new CosmosDatabaseBroker(mockCosmosClient.Object, options);
  }

  private static CosmosException MakeCosmosException(HttpStatusCode statusCode) =>
    new("cosmos failure", statusCode, 0, "activity", 0);

  /// <inheritdoc/>
  public void Dispose() => broker.Dispose();

  #region EnsureAnalysisQueueAsync Tests

  /// <summary>
  /// Verifies that when the container already exists with the desired default TTL (<c>-1</c>), the broker does
  /// NOT issue a redundant <see cref="Container.ReplaceContainerAsync"/> call, and that the underlying activity is
  /// enriched and marked successful when a listener is present.
  /// </summary>
  [TestMethod]
  public async Task EnsureAnalysisQueueAsync_ContainerAlreadyHasNegativeOneTtl_DoesNotCallReplaceContainer()
  {
    var properties = new ContainerProperties(ContainerId, "/bucket") { DefaultTimeToLive = -1 };
    var containerResponseMock = new Mock<ContainerResponse>();
    containerResponseMock.Setup(r => r.Resource).Returns(properties);
    containerResponseMock.Setup(r => r.Container).Returns(mockContainer.Object);

    mockDatabase
      .Setup(db => db.CreateContainerIfNotExistsAsync(
        It.IsAny<ContainerProperties>(), It.IsAny<int?>(), It.IsAny<RequestOptions>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(containerResponseMock.Object);

    using var activityRecorder = new InvoiceActivityRecorder();

    await broker.EnsureAnalysisQueueAsync(CancellationToken.None).ConfigureAwait(true);

    mockContainer.Verify(
      c => c.ReplaceContainerAsync(It.IsAny<ContainerProperties>(), It.IsAny<ContainerRequestOptions>(), It.IsAny<CancellationToken>()),
      Times.Never);

    var activity = activityRecorder.FindActivity(nameof(CosmosDatabaseBroker.EnsureAnalysisQueueAsync));
    Assert.IsNotNull(activity);
    Assert.AreEqual(ActivityStatusCode.Ok, activity.Status);
  }

  /// <summary>
  /// Verifies that when an already-existing container reports a default TTL other than <c>-1</c> (e.g. a container
  /// provisioned before this design, or restored from a backup with a finite TTL), the broker patches it via
  /// <see cref="Container.ReplaceContainerAsync"/> so item-level TTL is honored consistently in every environment.
  /// </summary>
  [TestMethod]
  public async Task EnsureAnalysisQueueAsync_ExistingContainerHasFiniteTtl_CallsReplaceContainerAsync()
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

    await broker.EnsureAnalysisQueueAsync(CancellationToken.None).ConfigureAwait(true);

    mockContainer.Verify(
      c => c.ReplaceContainerAsync(
        It.Is<ContainerProperties>(p => p.DefaultTimeToLive == -1), It.IsAny<ContainerRequestOptions>(), It.IsAny<CancellationToken>()),
      Times.Once);
  }

  #endregion

  #region CreateAnalysisRunAsync Tests

  /// <summary>Verifies that <see cref="CosmosDatabaseBroker.CreateAnalysisRunAsync"/> rejects a null run with <see cref="ArgumentNullException"/> before touching Cosmos.</summary>
  [TestMethod]
  public async Task CreateAnalysisRunAsync_NullRun_ThrowsArgumentNullException()
  {
    await Assert.ThrowsExactlyAsync<ArgumentNullException>(
      () => broker.CreateAnalysisRunAsync(null!, CancellationToken.None).AsTask()).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="CosmosDatabaseBroker.CreateAnalysisRunAsync"/> returns the created run stamped with the
  /// response's ETag on success, and records the Cosmos RU charge under the <c>"create"</c> operation tag.
  /// </summary>
  [TestMethod]
  public async Task CreateAnalysisRunAsync_Success_ReturnsRunWithETagAndRecordsCharge()
  {
    var run = AnalysisRunTestBuilder.Queued();
    var mockResponse = new Mock<ItemResponse<AnalysisRun>>();
    mockResponse.Setup(r => r.Resource).Returns(run);
    mockResponse.Setup(r => r.ETag).Returns("\"etag-created\"");
    mockResponse.Setup(r => r.RequestCharge).Returns(7.5);

    mockContainer
      .Setup(c => c.CreateItemAsync(run, It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(mockResponse.Object);

    using var metricRecorder = new InvoiceMetricRecorder(RequestChargeInstrument);

    var result = await broker.CreateAnalysisRunAsync(run, CancellationToken.None).ConfigureAwait(true);

    Assert.AreEqual("\"etag-created\"", result.ETag);

    var charges = metricRecorder.For(RequestChargeInstrument);
    Assert.AreEqual(1, charges.Count);
    Assert.AreEqual(7.5, (double)charges[0].Value);
    InvoiceMetricRecorder.AssertTag(charges[0], OperationTag, "create");
    InvoiceMetricRecorder.AssertTag(charges[0], ContainerTag, ContainerId);
  }

  /// <summary>
  /// Verifies that, when an <see cref="System.Diagnostics.ActivityListener"/> is present, a successful
  /// <see cref="CosmosDatabaseBroker.CreateAnalysisRunAsync"/> call enriches the underlying activity with Cosmos DB context
  /// and marks it successful, covering the "non-null activity" side of every <c>activity?.</c> branch in this method.
  /// </summary>
  [TestMethod]
  public async Task CreateAnalysisRunAsync_Success_RecordsActivityWhenListenerPresent()
  {
    var run = AnalysisRunTestBuilder.Queued();
    var mockResponse = new Mock<ItemResponse<AnalysisRun>>();
    mockResponse.Setup(r => r.Resource).Returns(run);
    mockResponse.Setup(r => r.ETag).Returns("\"etag-created\"");
    mockResponse.Setup(r => r.RequestCharge).Returns(7.5);

    mockContainer
      .Setup(c => c.CreateItemAsync(run, It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(mockResponse.Object);

    using var activityRecorder = new InvoiceActivityRecorder();

    await broker.CreateAnalysisRunAsync(run, CancellationToken.None).ConfigureAwait(true);

    var activity = activityRecorder.FindActivity(nameof(CosmosDatabaseBroker.CreateAnalysisRunAsync));
    Assert.IsNotNull(activity);
    Assert.AreEqual(ActivityStatusCode.Ok, activity.Status);
  }

  #endregion

  #region ReadAnalysisRunAsync Tests

  /// <summary>
  /// Verifies that <see cref="CosmosDatabaseBroker.ReadAnalysisRunAsync"/> returns the resolved run stamped with the
  /// response's ETag on success, and records the Cosmos RU charge under the <c>"read"</c> operation tag.
  /// </summary>
  [TestMethod]
  public async Task ReadAnalysisRunAsync_Found_ReturnsRunWithETagAndRecordsCharge()
  {
    var run = AnalysisRunTestBuilder.Queued();
    var mockResponse = new Mock<ItemResponse<AnalysisRun>>();
    mockResponse.Setup(r => r.Resource).Returns(run);
    mockResponse.Setup(r => r.ETag).Returns("\"etag-read\"");
    mockResponse.Setup(r => r.RequestCharge).Returns(2.25);

    mockContainer
      .Setup(c => c.ReadItemAsync<AnalysisRun>(run.Id.ToString(), It.IsAny<PartitionKey>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(mockResponse.Object);

    using var metricRecorder = new InvoiceMetricRecorder(RequestChargeInstrument);

    var result = await broker.ReadAnalysisRunAsync(run.Id, CancellationToken.None).ConfigureAwait(true);

    Assert.IsNotNull(result);
    Assert.AreEqual("\"etag-read\"", result.ETag);

    var charges = metricRecorder.For(RequestChargeInstrument);
    Assert.AreEqual(1, charges.Count);
    InvoiceMetricRecorder.AssertTag(charges[0], OperationTag, "read");
  }

  /// <summary>
  /// Verifies that, when an <see cref="System.Diagnostics.ActivityListener"/> is present, a successful (found)
  /// <see cref="CosmosDatabaseBroker.ReadAnalysisRunAsync"/> call enriches the underlying activity with Cosmos DB context
  /// and marks it successful, covering the "non-null activity" side of the found-path <c>activity?.</c> branches.
  /// </summary>
  [TestMethod]
  public async Task ReadAnalysisRunAsync_Found_RecordsActivityWhenListenerPresent()
  {
    var run = AnalysisRunTestBuilder.Queued();
    var mockResponse = new Mock<ItemResponse<AnalysisRun>>();
    mockResponse.Setup(r => r.Resource).Returns(run);
    mockResponse.Setup(r => r.ETag).Returns("\"etag-read\"");
    mockResponse.Setup(r => r.RequestCharge).Returns(2.25);

    mockContainer
      .Setup(c => c.ReadItemAsync<AnalysisRun>(run.Id.ToString(), It.IsAny<PartitionKey>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(mockResponse.Object);

    using var activityRecorder = new InvoiceActivityRecorder();

    await broker.ReadAnalysisRunAsync(run.Id, CancellationToken.None).ConfigureAwait(true);

    var activity = activityRecorder.FindActivity(nameof(CosmosDatabaseBroker.ReadAnalysisRunAsync));
    Assert.IsNotNull(activity);
    Assert.AreEqual(ActivityStatusCode.Ok, activity.Status);
  }

  /// <summary>
  /// Verifies that a Cosmos 404 (NotFound) surfaced by <see cref="CosmosDatabaseBroker.ReadAnalysisRunAsync"/> is treated as
  /// a benign "not found" result (<see langword="null"/>) rather than translated into a thrown exception, exercising
  /// the exception-filtered catch block's own success recording rather than the generic translation catch block.
  /// </summary>
  [TestMethod]
  public async Task ReadAnalysisRunAsync_WhenCosmos404_ReturnsNull()
  {
    var runId = Guid.NewGuid();
    mockContainer
      .Setup(c => c.ReadItemAsync<AnalysisRun>(runId.ToString(), It.IsAny<PartitionKey>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.NotFound));

    var result = await broker.ReadAnalysisRunAsync(runId, CancellationToken.None).ConfigureAwait(true);

    Assert.IsNull(result);
  }

  /// <summary>
  /// Verifies that, when an <see cref="System.Diagnostics.ActivityListener"/> is present, a Cosmos 404 (NotFound)
  /// surfaced by <see cref="CosmosDatabaseBroker.ReadAnalysisRunAsync"/> still marks the underlying activity successful,
  /// covering the "non-null activity" side of the NotFound-specific catch block's own success recording.
  /// </summary>
  [TestMethod]
  public async Task ReadAnalysisRunAsync_WhenCosmos404_RecordsActivityWhenListenerPresent()
  {
    var runId = Guid.NewGuid();
    mockContainer
      .Setup(c => c.ReadItemAsync<AnalysisRun>(runId.ToString(), It.IsAny<PartitionKey>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.NotFound));

    using var activityRecorder = new InvoiceActivityRecorder();

    await broker.ReadAnalysisRunAsync(runId, CancellationToken.None).ConfigureAwait(true);

    var activity = activityRecorder.FindActivity(nameof(CosmosDatabaseBroker.ReadAnalysisRunAsync));
    Assert.IsNotNull(activity);
    Assert.AreEqual(ActivityStatusCode.Ok, activity.Status);
  }

  /// <summary>
  /// Verifies that a non-404 Cosmos failure (412 PreconditionFailed) surfaced by
  /// <see cref="CosmosDatabaseBroker.ReadAnalysisRunAsync"/> is translated into <see cref="AnalysisRunLeaseConflictException"/>
  /// via this method's own (second) catch block, distinct from the NotFound-specific short-circuit above.
  /// </summary>
  [TestMethod]
  public async Task ReadAnalysisRunAsync_WhenCosmos412_ThrowsAnalysisRunLeaseConflictException()
  {
    var runId = Guid.NewGuid();
    mockContainer
      .Setup(c => c.ReadItemAsync<AnalysisRun>(runId.ToString(), It.IsAny<PartitionKey>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.PreconditionFailed));

    var exception = await Assert.ThrowsExactlyAsync<AnalysisRunLeaseConflictException>(
      () => broker.ReadAnalysisRunAsync(runId, CancellationToken.None).AsTask()).ConfigureAwait(true);

    Assert.IsTrue(exception.Message.Contains(runId.ToString(), StringComparison.Ordinal));
  }

  #endregion

  #region ReplaceAnalysisRunAsync Tests

  /// <summary>Verifies that <see cref="CosmosDatabaseBroker.ReplaceAnalysisRunAsync"/> rejects a null run with <see cref="ArgumentNullException"/> before touching Cosmos.</summary>
  [TestMethod]
  public async Task ReplaceAnalysisRunAsync_NullRun_ThrowsArgumentNullException()
  {
    await Assert.ThrowsExactlyAsync<ArgumentNullException>(
      () => broker.ReplaceAnalysisRunAsync(null!, "\"etag-1\"", CancellationToken.None).AsTask()).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="CosmosDatabaseBroker.ReplaceAnalysisRunAsync"/> rejects a null expected ETag with
  /// <see cref="ArgumentNullException"/>, since <see cref="ArgumentException.ThrowIfNullOrWhiteSpace"/> throws the
  /// null-specific subtype when the argument itself is <see langword="null"/>.
  /// </summary>
  [TestMethod]
  public async Task ReplaceAnalysisRunAsync_NullExpectedETag_ThrowsArgumentNullException()
  {
    var run = AnalysisRunTestBuilder.Queued();

    await Assert.ThrowsExactlyAsync<ArgumentNullException>(
      () => broker.ReplaceAnalysisRunAsync(run, null!, CancellationToken.None).AsTask()).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="CosmosDatabaseBroker.ReplaceAnalysisRunAsync"/> rejects an empty or whitespace-only expected
  /// ETag with the plain <see cref="ArgumentException"/> (not the null-specific subtype), covering the "blank but
  /// not null" side of <see cref="ArgumentException.ThrowIfNullOrWhiteSpace"/>.
  /// </summary>
  /// <param name="expectedETag">The blank ETag value under test.</param>
  [TestMethod]
  [DataRow("")]
  [DataRow("   ")]
  public async Task ReplaceAnalysisRunAsync_BlankExpectedETag_ThrowsArgumentException(string expectedETag)
  {
    var run = AnalysisRunTestBuilder.Queued();

    await Assert.ThrowsExactlyAsync<ArgumentException>(
      () => broker.ReplaceAnalysisRunAsync(run, expectedETag, CancellationToken.None).AsTask()).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="CosmosDatabaseBroker.ReplaceAnalysisRunAsync"/> returns the replaced run stamped with the
  /// response's ETag on success, and records the Cosmos RU charge under the <c>"replace"</c> operation tag.
  /// </summary>
  [TestMethod]
  public async Task ReplaceAnalysisRunAsync_Success_ReturnsRunWithETagAndRecordsCharge()
  {
    var run = AnalysisRunTestBuilder.Queued();
    var mockResponse = new Mock<ItemResponse<AnalysisRun>>();
    mockResponse.Setup(r => r.Resource).Returns(run);
    mockResponse.Setup(r => r.ETag).Returns("\"etag-replaced\"");
    mockResponse.Setup(r => r.RequestCharge).Returns(4.0);

    mockContainer
      .Setup(c => c.ReplaceItemAsync(run, run.Id.ToString(), It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(mockResponse.Object);

    using var metricRecorder = new InvoiceMetricRecorder(RequestChargeInstrument);

    var result = await broker.ReplaceAnalysisRunAsync(run, "\"etag-1\"", CancellationToken.None).ConfigureAwait(true);

    Assert.AreEqual("\"etag-replaced\"", result.ETag);

    var charges = metricRecorder.For(RequestChargeInstrument);
    Assert.AreEqual(1, charges.Count);
    InvoiceMetricRecorder.AssertTag(charges[0], OperationTag, "replace");
  }

  /// <summary>
  /// Verifies that, when an <see cref="System.Diagnostics.ActivityListener"/> is present, a successful
  /// <see cref="CosmosDatabaseBroker.ReplaceAnalysisRunAsync"/> call enriches the underlying activity with Cosmos DB context
  /// and marks it successful, covering the "non-null activity" side of every <c>activity?.</c> branch in this method.
  /// </summary>
  [TestMethod]
  public async Task ReplaceAnalysisRunAsync_Success_RecordsActivityWhenListenerPresent()
  {
    var run = AnalysisRunTestBuilder.Queued();
    var mockResponse = new Mock<ItemResponse<AnalysisRun>>();
    mockResponse.Setup(r => r.Resource).Returns(run);
    mockResponse.Setup(r => r.ETag).Returns("\"etag-replaced\"");
    mockResponse.Setup(r => r.RequestCharge).Returns(4.0);

    mockContainer
      .Setup(c => c.ReplaceItemAsync(run, run.Id.ToString(), It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(mockResponse.Object);

    using var activityRecorder = new InvoiceActivityRecorder();

    await broker.ReplaceAnalysisRunAsync(run, "\"etag-1\"", CancellationToken.None).ConfigureAwait(true);

    var activity = activityRecorder.FindActivity(nameof(CosmosDatabaseBroker.ReplaceAnalysisRunAsync));
    Assert.IsNotNull(activity);
    Assert.AreEqual(ActivityStatusCode.Ok, activity.Status);
  }

  #endregion

  #region StreamAnalysisRunClaimCandidatesAsync Tests

  /// <summary>
  /// Verifies that <see cref="CosmosDatabaseBroker.StreamAnalysisRunClaimCandidatesAsync"/> yields candidates from every
  /// page in emission order, records the RU charge of each page under the <c>"claim_candidates"</c> operation tag,
  /// and enriches the underlying activity with Cosmos DB context before completing successfully.
  /// </summary>
  [TestMethod]
  public async Task StreamAnalysisRunClaimCandidatesAsync_MultiplePages_YieldsCandidatesInOrderAndRecordsChargePerPage()
  {
    var first = AnalysisRunTestBuilder.Queued();
    var second = AnalysisRunTestBuilder.ExpiredRunning();
    SetUpClaimCandidatePages(([first], 3.0), ([second], 2.0));

    using var metricRecorder = new InvoiceMetricRecorder(RequestChargeInstrument);
    using var activityRecorder = new InvoiceActivityRecorder();

    List<AnalysisRun> results = [];
    await foreach (var candidate in broker.StreamAnalysisRunClaimCandidatesAsync(DateTimeOffset.UtcNow, CancellationToken.None).ConfigureAwait(true))
    {
      results.Add(candidate);
    }

    Assert.AreEqual(2, results.Count);
    Assert.AreEqual(first.Id, results[0].Id);
    Assert.AreEqual(second.Id, results[1].Id);

    var charges = metricRecorder.For(RequestChargeInstrument);
    Assert.AreEqual(2, charges.Count);
    Assert.AreEqual(3.0, (double)charges[0].Value);
    Assert.AreEqual(2.0, (double)charges[1].Value);
    InvoiceMetricRecorder.AssertTag(charges[0], OperationTag, "claim_candidates");
    InvoiceMetricRecorder.AssertTag(charges[0], ContainerTag, ContainerId);

    var activity = activityRecorder.FindActivity(nameof(CosmosDatabaseBroker.StreamAnalysisRunClaimCandidatesAsync));
    Assert.IsNotNull(activity);
    Assert.AreEqual(ActivityStatusCode.Ok, activity.Status);
  }

  /// <summary>Verifies that a claim-candidate page with zero items yields no candidates while still recording its RU charge.</summary>
  [TestMethod]
  public async Task StreamAnalysisRunClaimCandidatesAsync_EmptyPage_YieldsNoCandidatesButRecordsCharge()
  {
    SetUpClaimCandidatePages((Array.Empty<AnalysisRun>(), 0.5));

    using var recorder = new InvoiceMetricRecorder(RequestChargeInstrument);

    List<AnalysisRun> results = [];
    await foreach (var candidate in broker.StreamAnalysisRunClaimCandidatesAsync(DateTimeOffset.UtcNow, CancellationToken.None).ConfigureAwait(true))
    {
      results.Add(candidate);
    }

    Assert.AreEqual(0, results.Count);
    Assert.AreEqual(1, recorder.For(RequestChargeInstrument).Count);
  }

  /// <summary>
  /// Verifies that <see cref="CosmosDatabaseBroker.StreamAnalysisRunClaimCandidatesAsync"/> observes cancellation before
  /// reading the first page, propagating <see cref="OperationCanceledException"/> unchanged rather than swallowing it.
  /// </summary>
  [TestMethod]
  public async Task StreamAnalysisRunClaimCandidatesAsync_CancellationRequested_ThrowsOperationCanceledException()
  {
    SetUpClaimCandidateCancellation();
    using var cts = new CancellationTokenSource();
    await cts.CancelAsync().ConfigureAwait(true);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(async () =>
    {
      await foreach (var _ in broker.StreamAnalysisRunClaimCandidatesAsync(DateTimeOffset.UtcNow, cts.Token).ConfigureAwait(true))
      {
      }
    }).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that a Cosmos 404 (NotFound) surfaced while reading a claim-candidate page is translated using the
  /// generic (no run identifier) message, since streaming candidates has no single run in scope.
  /// </summary>
  [TestMethod]
  public async Task StreamAnalysisRunClaimCandidatesAsync_CosmosNotFoundOnReadNext_ThrowsAnalysisRunNotFoundExceptionWithGenericMessage()
  {
    SetUpClaimCandidateFailure(MakeCosmosException(HttpStatusCode.NotFound));

    var exception = await Assert.ThrowsExactlyAsync<AnalysisRunNotFoundException>(async () =>
    {
      await foreach (var _ in broker.StreamAnalysisRunClaimCandidatesAsync(DateTimeOffset.UtcNow, CancellationToken.None).ConfigureAwait(true))
      {
      }
    }).ConfigureAwait(true);

    Assert.AreEqual("Analysis run not found.", exception.Message);
  }

  #endregion

  #region CountPendingAnalysisRunsByTargetTypeAsync Tests

  /// <summary>
  /// Verifies that <see cref="CosmosDatabaseBroker.CountPendingAnalysisRunsByTargetTypeAsync"/> aggregates the grouped
  /// projection rows from every page into a single per-target-type dictionary, records the RU charge of each page
  /// under the <c>"count_pending"</c> operation tag, and enriches the underlying activity before completing.
  /// </summary>
  [TestMethod]
  public async Task CountPendingAnalysisRunsByTargetTypeAsync_MultipleTargetTypesAcrossPages_ReturnsAggregatedCountsAndRecordsCharge()
  {
    SetUpPendingCountPages(
      ([(AnalysisTargetType.Invoice, 5L)], 1.1),
      ([(AnalysisTargetType.Merchant, 3L), (AnalysisTargetType.Product, 1L)], 0.9));

    using var metricRecorder = new InvoiceMetricRecorder(RequestChargeInstrument);
    using var activityRecorder = new InvoiceActivityRecorder();

    var counts = await broker.CountPendingAnalysisRunsByTargetTypeAsync(DateTimeOffset.UtcNow, CancellationToken.None).ConfigureAwait(true);

    Assert.AreEqual(3, counts.Count);
    Assert.AreEqual(5L, counts[AnalysisTargetType.Invoice]);
    Assert.AreEqual(3L, counts[AnalysisTargetType.Merchant]);
    Assert.AreEqual(1L, counts[AnalysisTargetType.Product]);

    var charges = metricRecorder.For(RequestChargeInstrument);
    Assert.AreEqual(2, charges.Count);
    InvoiceMetricRecorder.AssertTag(charges[0], OperationTag, "count_pending");

    var activity = activityRecorder.FindActivity(nameof(CosmosDatabaseBroker.CountPendingAnalysisRunsByTargetTypeAsync));
    Assert.IsNotNull(activity);
    Assert.AreEqual(ActivityStatusCode.Ok, activity.Status);
  }

  /// <summary>Verifies that an empty projection page yields an empty result dictionary rather than a lookup failure.</summary>
  [TestMethod]
  public async Task CountPendingAnalysisRunsByTargetTypeAsync_NoResults_ReturnsEmptyDictionary()
  {
    SetUpPendingCountPages(([], 0.3));

    var counts = await broker.CountPendingAnalysisRunsByTargetTypeAsync(DateTimeOffset.UtcNow, CancellationToken.None).ConfigureAwait(true);

    Assert.AreEqual(0, counts.Count);
  }

  /// <summary>
  /// Verifies that <see cref="CosmosDatabaseBroker.CountPendingAnalysisRunsByTargetTypeAsync"/> observes cancellation before
  /// reading the first page, propagating <see cref="OperationCanceledException"/> unchanged rather than swallowing it.
  /// </summary>
  [TestMethod]
  public async Task CountPendingAnalysisRunsByTargetTypeAsync_CancellationRequested_ThrowsOperationCanceledException()
  {
    SetUpPendingCountCancellation();
    using var cts = new CancellationTokenSource();
    await cts.CancelAsync().ConfigureAwait(true);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => broker.CountPendingAnalysisRunsByTargetTypeAsync(DateTimeOffset.UtcNow, cts.Token).AsTask()).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that a Cosmos 412 (PreconditionFailed) surfaced while reading a pending-count page is translated using
  /// the generic (no run identifier) message, since counting pending runs has no single run in scope.
  /// </summary>
  [TestMethod]
  public async Task CountPendingAnalysisRunsByTargetTypeAsync_CosmosPreconditionFailedOnReadNext_ThrowsAnalysisRunLeaseConflictExceptionWithGenericMessage()
  {
    SetUpPendingCountFailure(MakeCosmosException(HttpStatusCode.PreconditionFailed));

    var exception = await Assert.ThrowsExactlyAsync<AnalysisRunLeaseConflictException>(
      () => broker.CountPendingAnalysisRunsByTargetTypeAsync(DateTimeOffset.UtcNow, CancellationToken.None).AsTask()).ConfigureAwait(true);

    Assert.AreEqual("An analysis run was modified concurrently; the expected revision is stale.", exception.Message);
  }

  #endregion


  #region Cosmos Exception Translation Tests

  /// <summary>
  /// Verifies that a Cosmos 404 (NotFound) surfaced while replacing a run (e.g. the run was deleted concurrently)
  /// is translated into <see cref="AnalysisRunNotFoundException"/> rather than propagating the raw <see cref="CosmosException"/>.
  /// </summary>
  [TestMethod]
  public async Task ReplaceAnalysisRunAsync_WhenCosmos404_ThrowsAnalysisRunNotFoundException()
  {
    var run = AnalysisRunTestBuilder.Queued();
    mockContainer
      .Setup(c => c.ReplaceItemAsync(run, run.Id.ToString(), It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.NotFound));

    await Assert.ThrowsExactlyAsync<AnalysisRunNotFoundException>(
      () => broker.ReplaceAnalysisRunAsync(run, "\"etag-1\"", CancellationToken.None).AsTask()).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that a Cosmos 412 (PreconditionFailed) surfaced by a direct <see cref="CosmosDatabaseBroker.ReplaceAnalysisRunAsync"/>
  /// call (outside the internal claim-skip loop) is translated into <see cref="AnalysisRunLeaseConflictException"/>.
  /// </summary>
  [TestMethod]
  public async Task ReplaceAnalysisRunAsync_WhenCosmos412_ThrowsAnalysisRunLeaseConflictException()
  {
    var run = AnalysisRunTestBuilder.Queued();
    mockContainer
      .Setup(c => c.ReplaceItemAsync(run, run.Id.ToString(), It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.PreconditionFailed));

    await Assert.ThrowsExactlyAsync<AnalysisRunLeaseConflictException>(
      () => broker.ReplaceAnalysisRunAsync(run, "\"etag-1\"", CancellationToken.None).AsTask()).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that a Cosmos 429 (TooManyRequests) surfaced by <see cref="CosmosDatabaseBroker.ReplaceAnalysisRunAsync"/> is
  /// translated into <see cref="AnalysisRunCosmosDbRateLimitException"/> (HTTP 429 preserved end-to-end, not
  /// collapsed into a generic dependency/503 outcome), defaulting the retry-after hint to one second when Cosmos
  /// does not supply a concrete value (as is the case for a locally-constructed <see cref="CosmosException"/>).
  /// </summary>
  [TestMethod]
  public async Task ReplaceAnalysisRunAsync_WhenCosmos429_ThrowsAnalysisRunCosmosDbRateLimitExceptionWithRetryAfter()
  {
    var run = AnalysisRunTestBuilder.Queued();
    mockContainer
      .Setup(c => c.ReplaceItemAsync(run, run.Id.ToString(), It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.TooManyRequests));

    var exception = await Assert.ThrowsExactlyAsync<AnalysisRunCosmosDbRateLimitException>(
      () => broker.ReplaceAnalysisRunAsync(run, "\"etag-1\"", CancellationToken.None).AsTask()).ConfigureAwait(true);

    Assert.AreEqual(TimeSpan.FromSeconds(1), exception.RetryAfter);
    Assert.IsInstanceOfType<CosmosException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that when a Cosmos 429 (TooManyRequests) DOES supply a concrete <see cref="CosmosException.RetryAfter"/>
  /// value (unlike the SDK's public constructor, which always yields <see langword="null"/>), the translated
  /// <see cref="AnalysisRunCosmosDbRateLimitException"/> preserves that exact value rather than falling back to the
  /// one-second default, covering the "has a value" side of the <c>?? TimeSpan.FromSeconds(1)</c> fallback.
  /// </summary>
  [TestMethod]
  public async Task ReplaceAnalysisRunAsync_WhenCosmos429ProvidesRetryAfter_PreservesRetryAfterFromException()
  {
    var run = AnalysisRunTestBuilder.Queued();
    var retryAfter = TimeSpan.FromSeconds(42);
    mockContainer
      .Setup(c => c.ReplaceItemAsync(run, run.Id.ToString(), It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new CosmosExceptionWithRetryAfter(retryAfter));

    var exception = await Assert.ThrowsExactlyAsync<AnalysisRunCosmosDbRateLimitException>(
      () => broker.ReplaceAnalysisRunAsync(run, "\"etag-1\"", CancellationToken.None).AsTask()).ConfigureAwait(true);

    Assert.AreEqual(retryAfter, exception.RetryAfter);
  }

  /// <summary>
  /// Verifies that a Cosmos 429 (TooManyRequests) surfaced by <see cref="CosmosDatabaseBroker.CreateAnalysisRunAsync"/> is
  /// also translated into <see cref="AnalysisRunCosmosDbRateLimitException"/>, confirming the translation is applied
  /// uniformly across every broker operation and not only the claim/replace path.
  /// </summary>
  [TestMethod]
  public async Task CreateAnalysisRunAsync_WhenCosmos429_ThrowsAnalysisRunCosmosDbRateLimitException()
  {
    var run = AnalysisRunTestBuilder.Queued();
    mockContainer
      .Setup(c => c.CreateItemAsync(run, It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.TooManyRequests));

    await Assert.ThrowsExactlyAsync<AnalysisRunCosmosDbRateLimitException>(
      () => broker.CreateAnalysisRunAsync(run, CancellationToken.None).AsTask()).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that a Cosmos failure whose <see cref="HttpStatusCode"/> is not explicitly mapped (anything other than
  /// 404/412/429) falls through the internal status-code switch to its default arm, which rethrows the original
  /// <see cref="CosmosException"/> completely unwrapped rather than translating it into one of the typed analysis
  /// run inner exceptions, covering the switch's otherwise-unreachable <c>_ =&gt; cosmosException</c> arm.
  /// </summary>
  [TestMethod]
  public async Task CreateAnalysisRunAsync_WhenCosmosStatusCodeIsUnhandled_RethrowsOriginalCosmosException()
  {
    var run = AnalysisRunTestBuilder.Queued();
    var cosmosException = MakeCosmosException(HttpStatusCode.InternalServerError);
    mockContainer
      .Setup(c => c.CreateItemAsync(run, It.IsAny<PartitionKey?>(), It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(cosmosException);

    var exception = await Assert.ThrowsExactlyAsync<CosmosException>(
      () => broker.CreateAnalysisRunAsync(run, CancellationToken.None).AsTask()).ConfigureAwait(true);

    Assert.AreSame(cosmosException, exception);
  }

  #endregion

  #region Test Helpers

  /// <summary>
  /// The runtime <c>PendingCountProjection</c> nested record type declared inside
  /// <see cref="CosmosDatabaseBroker"/>. It is resolved via reflection because it is <see langword="private"/> to
  /// the broker and therefore cannot be named directly from test code, yet the mocked container's query iterator
  /// must still be closed over this exact type in order to exercise the grouped pending-count query.
  /// </summary>
  private static readonly Type PendingCountProjectionType =
    typeof(CosmosDatabaseBroker).GetNestedType("PendingCountProjection", BindingFlags.NonPublic)
    ?? throw new InvalidOperationException("PendingCountProjection nested type was not found via reflection.");

  /// <summary>
  /// Wires the mocked container's query iterator, for the given projection type, to yield the given pages in order,
  /// each reporting its own RU charge, following the established <c>FeedIterator</c>/<c>FeedResponse</c> mocking
  /// pattern used by <c>MerchantNoSqlBrokerTests</c>.
  /// </summary>
  /// <typeparam name="T">The Cosmos query projection type (either <see cref="AnalysisRun"/> or the private pending-count projection).</typeparam>
  /// <param name="pages">Each page's boxed items and the RU charge to report for that page.</param>
  private void SetUpQueryPages<T>(params (IReadOnlyList<object> Items, double RequestCharge)[] pages)
  {
    var mockIterator = new Mock<FeedIterator<T>>();

    var hasMoreSequence = mockIterator.SetupSequence(iterator => iterator.HasMoreResults);
    foreach (var _ in pages)
    {
      hasMoreSequence = hasMoreSequence.Returns(true);
    }

    hasMoreSequence.Returns(false);

    var readNextSequence = mockIterator.SetupSequence(iterator => iterator.ReadNextAsync(It.IsAny<CancellationToken>()));
    foreach (var page in pages)
    {
      var mockResponse = new Mock<FeedResponse<T>>();
      mockResponse.Setup(response => response.GetEnumerator()).Returns(() => page.Items.Cast<T>().GetEnumerator());
      mockResponse.Setup(response => response.RequestCharge).Returns(page.RequestCharge);
      readNextSequence = readNextSequence.Returns(Task.FromResult(mockResponse.Object));
    }

    mockContainer
      .Setup(container => container.GetItemQueryIterator<T>(It.IsAny<QueryDefinition>(), It.IsAny<string>(), It.IsAny<QueryRequestOptions>()))
      .Returns(mockIterator.Object);
  }

  /// <summary>
  /// Wires the mocked container's query iterator, for the given projection type, so <c>HasMoreResults</c> is
  /// permanently <see langword="true"/> without any page ever being read, letting cancellation tests observe the
  /// pre-read cancellation check inside the broker's paging loop.
  /// </summary>
  /// <typeparam name="T">The Cosmos query projection type.</typeparam>
  private void SetUpQueryCancellation<T>()
  {
    var mockIterator = new Mock<FeedIterator<T>>();
    mockIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);

    mockContainer
      .Setup(container => container.GetItemQueryIterator<T>(It.IsAny<QueryDefinition>(), It.IsAny<string>(), It.IsAny<QueryRequestOptions>()))
      .Returns(mockIterator.Object);
  }

  /// <summary>
  /// Wires the mocked container's query iterator, for the given projection type, so the first page read throws the
  /// given Cosmos exception.
  /// </summary>
  /// <typeparam name="T">The Cosmos query projection type.</typeparam>
  /// <param name="exception">The exception to throw from the first page read.</param>
  private void SetUpQueryFailure<T>(CosmosException exception)
  {
    var mockIterator = new Mock<FeedIterator<T>>();
    mockIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<CancellationToken>())).ThrowsAsync(exception);

    mockContainer
      .Setup(container => container.GetItemQueryIterator<T>(It.IsAny<QueryDefinition>(), It.IsAny<string>(), It.IsAny<QueryRequestOptions>()))
      .Returns(mockIterator.Object);
  }

  /// <summary>Wires claim-candidate query pages directly (compile-time) over the public <see cref="AnalysisRun"/> type.</summary>
  /// <param name="pages">Each page's items and the RU charge to report for that page.</param>
  private void SetUpClaimCandidatePages(params (IReadOnlyList<AnalysisRun> Items, double RequestCharge)[] pages)
  {
    var boxedPages = pages
      .Select(page => ((IReadOnlyList<object>)page.Items.Cast<object>().ToList(), page.RequestCharge))
      .ToArray();

    SetUpQueryPages<AnalysisRun>(boxedPages);
  }

  /// <summary>Wires the claim-candidate query so it reports more results but nothing has been read yet.</summary>
  private void SetUpClaimCandidateCancellation() => SetUpQueryCancellation<AnalysisRun>();

  /// <summary>Wires the claim-candidate query so the first page read throws the given Cosmos exception.</summary>
  /// <param name="exception">The exception to throw from the first page read.</param>
  private void SetUpClaimCandidateFailure(CosmosException exception) => SetUpQueryFailure<AnalysisRun>(exception);

  /// <summary>Constructs a boxed instance of the private <c>PendingCountProjection</c> record via reflection.</summary>
  /// <param name="targetType">The target type for the grouped row.</param>
  /// <param name="count">The pending count for the grouped row.</param>
  private static object CreatePendingCountProjection(AnalysisTargetType targetType, long count) =>
    Activator.CreateInstance(PendingCountProjectionType, targetType, count)!;

  /// <summary>
  /// Wires the mocked container's grouped pending-count query iterator, via a hand-built (non-Moq)
  /// <see cref="FakeFeedIterator{T}"/> closed over the private projection type, to yield the given pages in order.
  /// A real Cosmos SDK mock cannot be used for <see cref="FeedIterator{T}"/>/<see cref="FeedResponse{T}"/> here
  /// because Castle DynamicProxy refuses to generate a proxy closed over an inaccessible (private) type argument;
  /// see <see cref="SetUpGetItemQueryIterator"/> for how the container call itself is still wired via Moq.
  /// </summary>
  /// <param name="pages">Each page's grouped rows (target type, count) and the RU charge to report for that page.</param>
  private void SetUpPendingCountPages(params (IReadOnlyList<(AnalysisTargetType TargetType, long Count)> Rows, double RequestCharge)[] pages)
  {
    var closedResponseType = typeof(FakeFeedResponse<>).MakeGenericType(PendingCountProjectionType);
    var responses = Array.CreateInstance(typeof(FeedResponse<>).MakeGenericType(PendingCountProjectionType), pages.Length);

    for (var pageIndex = 0; pageIndex < pages.Length; pageIndex++)
    {
      var rows = pages[pageIndex].Rows;
      var typedRows = Array.CreateInstance(PendingCountProjectionType, rows.Count);
      for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
      {
        typedRows.SetValue(CreatePendingCountProjection(rows[rowIndex].TargetType, rows[rowIndex].Count), rowIndex);
      }

      responses.SetValue(Activator.CreateInstance(closedResponseType, typedRows, pages[pageIndex].RequestCharge), pageIndex);
    }

    var closedIteratorType = typeof(FakeFeedIterator<>).MakeGenericType(PendingCountProjectionType);
    var iterator = Activator.CreateInstance(closedIteratorType, (object)responses)
      ?? throw new InvalidOperationException("Failed to construct a closed FakeFeedIterator<PendingCountProjection>.");

    SetUpGetItemQueryIterator(PendingCountProjectionType, iterator);
  }

  /// <summary>Wires the pending-count query so it reports more results but nothing has been read yet.</summary>
  private void SetUpPendingCountCancellation()
  {
    var closedIteratorType = typeof(FakeFeedIterator<>).MakeGenericType(PendingCountProjectionType);
    var iterator = Activator.CreateInstance(closedIteratorType)
      ?? throw new InvalidOperationException("Failed to construct a closed FakeFeedIterator<PendingCountProjection>.");

    SetUpGetItemQueryIterator(PendingCountProjectionType, iterator);
  }

  /// <summary>Wires the pending-count query so the first page read throws the given Cosmos exception.</summary>
  /// <param name="exception">The exception to throw from the first page read.</param>
  private void SetUpPendingCountFailure(CosmosException exception)
  {
    var closedIteratorType = typeof(FakeFeedIterator<>).MakeGenericType(PendingCountProjectionType);
    var iterator = Activator.CreateInstance(closedIteratorType, exception)
      ?? throw new InvalidOperationException("Failed to construct a closed FakeFeedIterator<PendingCountProjection>.");

    SetUpGetItemQueryIterator(PendingCountProjectionType, iterator);
  }

  /// <summary>
  /// Configures the mocked container's <see cref="Container.GetItemQueryIterator{T}(QueryDefinition, string, QueryRequestOptions)"/>
  /// method — closed over the given (possibly private) projection type — to return the given already-constructed
  /// <see cref="FeedIterator{T}"/> instance. A hand-built <see cref="Expression"/> tree and reflection are used
  /// instead of Moq's ordinary strongly typed <c>Setup</c> API because the projection type may be private (e.g. the
  /// broker's own <c>PendingCountProjection</c>), which cannot be named from test source. This is safe even though
  /// <see cref="Container"/> is itself a Moq mock: the already-generated <see cref="Container"/> proxy does not
  /// depend on the query's row type at all (it is a method-level generic parameter), so closing its generic method
  /// over a private type is a plain reflection invocation with no new dynamic-proxy type generation involved.
  /// </summary>
  /// <param name="projectionType">The closed generic query projection type.</param>
  /// <param name="iterator">The already-constructed iterator instance to return.</param>
  private void SetUpGetItemQueryIterator(Type projectionType, object iterator)
  {
    var getIteratorMethod = typeof(Container)
      .GetMethods()
      .First(method => method.Name == nameof(Container.GetItemQueryIterator) && method.GetParameters()[0].ParameterType == typeof(QueryDefinition))
      .MakeGenericMethod(projectionType);
    var feedIteratorType = getIteratorMethod.ReturnType;

    var containerParameter = Expression.Parameter(typeof(Container), "container");
    var isAnyMethod = typeof(It).GetMethods().First(method => method.Name == nameof(It.IsAny));
    Expression[] arguments =
    [
      Expression.Call(isAnyMethod.MakeGenericMethod(typeof(QueryDefinition))),
      Expression.Call(isAnyMethod.MakeGenericMethod(typeof(string))),
      Expression.Call(isAnyMethod.MakeGenericMethod(typeof(QueryRequestOptions))),
    ];
    var call = Expression.Call(containerParameter, getIteratorMethod, arguments);
    var lambda = Expression.Lambda(typeof(Func<,>).MakeGenericType(typeof(Container), feedIteratorType), call, containerParameter);

    var setupMethod = typeof(Mock<Container>)
      .GetMethods()
      .First(method => method.Name == nameof(Mock<Container>.Setup) && method.IsGenericMethodDefinition && method.GetParameters().Length == 1)
      .MakeGenericMethod(feedIteratorType);
    var setup = setupMethod.Invoke(mockContainer, [lambda])
      ?? throw new InvalidOperationException("Mock<Container>.Setup returned null via reflection.");

    var returnsMethod = setup
      .GetType()
      .GetMethods()
      .First(method => method.Name == "Returns" && method.GetParameters().Length == 1 && method.GetParameters()[0].ParameterType == feedIteratorType);
    returnsMethod.Invoke(setup, [iterator]);
  }

  /// <summary>
  /// Minimal concrete <see cref="FeedResponse{T}"/> used in place of a Moq mock, since Castle DynamicProxy cannot
  /// generate a proxy for <see cref="FeedResponse{T}"/> closed over a private type. Members not observed by
  /// <see cref="CosmosDatabaseBroker"/> are given innocuous defaults.
  /// </summary>
  /// <typeparam name="T">The projected row type.</typeparam>
  [SuppressMessage("Performance", "CA1812:Avoid uninstantiated internal classes", Justification =
    "Instantiated exclusively via Activator.CreateInstance/MakeGenericType, closed over a runtime-only projection type the analyzer cannot see referenced by name.")]
  private sealed class FakeFeedResponse<T> : FeedResponse<T>
  {
    private readonly IReadOnlyList<T> items;

    /// <summary>Initializes a new instance of the <see cref="FakeFeedResponse{T}"/> class.</summary>
    /// <param name="items">The page's rows.</param>
    /// <param name="requestCharge">The RU charge to report for this page.</param>
    public FakeFeedResponse(IReadOnlyList<T> items, double requestCharge)
    {
      this.items = items;
      RequestCharge = requestCharge;
    }

    /// <inheritdoc/>
    public override double RequestCharge { get; }

    /// <inheritdoc/>
    public override string ActivityId => string.Empty;

    /// <inheritdoc/>
    public override string ETag => string.Empty;

    /// <inheritdoc/>
    public override string QueryAdvice => string.Empty;

    /// <inheritdoc/>
    public override string ContinuationToken => null!;

    /// <inheritdoc/>
    public override int Count => items.Count;

    /// <inheritdoc/>
    public override string IndexMetrics => string.Empty;

    /// <inheritdoc/>
    public override Headers Headers { get; } = new();

    /// <inheritdoc/>
    public override IEnumerable<T> Resource => items;

    /// <inheritdoc/>
    public override HttpStatusCode StatusCode => HttpStatusCode.OK;

    /// <inheritdoc/>
    public override CosmosDiagnostics Diagnostics => null!;

    /// <inheritdoc/>
    public override IEnumerator<T> GetEnumerator() => items.GetEnumerator();
  }

  /// <summary>
  /// Minimal concrete <see cref="FeedIterator{T}"/> used in place of a Moq mock, since Castle DynamicProxy cannot
  /// generate a proxy for <see cref="FeedIterator{T}"/> closed over a private type. Depending on which constructor
  /// is used, it either replays a fixed sequence of pages, reports results forever without ever completing a read
  /// (for cancellation tests), or throws a fixed exception from its first read (for failure-translation tests).
  /// </summary>
  /// <typeparam name="T">The projected row type.</typeparam>
  [SuppressMessage("Performance", "CA1812:Avoid uninstantiated internal classes", Justification =
    "Instantiated exclusively via Activator.CreateInstance/MakeGenericType, closed over a runtime-only projection type the analyzer cannot see referenced by name.")]
  private sealed class FakeFeedIterator<T> : FeedIterator<T>
  {
    private readonly Queue<FeedResponse<T>> pages = new();
    private readonly Exception? failure;
    private readonly bool infiniteHasMoreResults;

    /// <summary>Initializes a new instance of the <see cref="FakeFeedIterator{T}"/> class that replays the given pages in order.</summary>
    /// <param name="pages">The pages to replay, in order.</param>
    public FakeFeedIterator(IEnumerable<FeedResponse<T>> pages) => this.pages = new Queue<FeedResponse<T>>(pages);

    /// <summary>
    /// Initializes a new instance of the <see cref="FakeFeedIterator{T}"/> class that always reports more results
    /// without ever completing a read, for cancellation tests.
    /// </summary>
    public FakeFeedIterator() => infiniteHasMoreResults = true;

    /// <summary>Initializes a new instance of the <see cref="FakeFeedIterator{T}"/> class that throws the given exception from its first page read.</summary>
    /// <param name="failure">The exception to throw.</param>
    public FakeFeedIterator(Exception failure) => this.failure = failure;

    /// <inheritdoc/>
    public override bool HasMoreResults => infiniteHasMoreResults || failure is not null || pages.Count > 0;

    /// <inheritdoc/>
    public override Task<FeedResponse<T>> ReadNextAsync(CancellationToken cancellationToken = default)
    {
      if (failure is not null)
      {
        throw failure;
      }

      return Task.FromResult(pages.Dequeue());
    }
  }

  /// <summary>
  /// Test-only <see cref="CosmosException"/> subclass that supplies a deterministic <see cref="CosmosException.RetryAfter"/>
  /// value, since the SDK's sole public constructor always yields <see langword="null"/> for that property.
  /// </summary>
  [SuppressMessage("Design", "CA1032:Implement standard exception constructors", Justification =
    "Test-only helper deliberately mirrors CosmosException's sole public constructor shape; the base type exposes no parameterless or message-only constructor to forward to.")]
  private sealed class CosmosExceptionWithRetryAfter : CosmosException
  {
    private readonly TimeSpan retryAfterValue;

    /// <summary>Initializes a new instance of the <see cref="CosmosExceptionWithRetryAfter"/> class.</summary>
    /// <param name="retryAfterValue">The fixed retry-after value to report.</param>
    public CosmosExceptionWithRetryAfter(TimeSpan retryAfterValue)
      : base("cosmos failure", HttpStatusCode.TooManyRequests, 0, "activity", 0) =>
      this.retryAfterValue = retryAfterValue;

    /// <inheritdoc/>
    public override TimeSpan? RetryAfter => retryAfterValue;
  }

  #endregion
}