namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.AnalysisRunBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for <see cref="AnalysisRunFoundationService"/> covering CRUD/claim/lease coordination,
/// exception classification, and cancellation passthrough. The broker (the true external Cosmos DB
/// boundary) is mocked via <see cref="Mock{T}"/>; the aggregate's own state-machine logic runs for real.
/// </summary>
[TestClass]
public sealed class AnalysisRunFoundationServiceTests
{
  private readonly Mock<IAnalysisRunBroker> mockBroker;
  private readonly AnalysisRunFoundationService service;

  /// <summary>
  /// Initializes test fixtures with a mocked broker for isolated foundation service testing.
  /// </summary>
  public AnalysisRunFoundationServiceTests()
  {
    mockBroker = new Mock<IAnalysisRunBroker>();
    service = new AnalysisRunFoundationService(mockBroker.Object, NullLoggerFactory.Instance);
  }

  #region Constructor Tests
  /// <summary>
  /// Verifies the constructor throws when the broker dependency is null.
  /// </summary>
  [TestMethod]
  public void Constructor_NullBroker_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() =>
      new AnalysisRunFoundationService(null!, NullLoggerFactory.Instance));

  /// <summary>
  /// Verifies the constructor throws when the logger factory dependency is null.
  /// </summary>
  [TestMethod]
  public void Constructor_NullLoggerFactory_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() =>
      new AnalysisRunFoundationService(mockBroker.Object, null!));
  #endregion

  #region EnsureStoreAsync Tests
  /// <summary>
  /// Verifies that <see cref="AnalysisRunFoundationService.EnsureStoreAsync"/> delegates to the broker.
  /// </summary>
  [TestMethod]
  public async Task EnsureStoreAsync_Always_CallsBrokerEnsureContainer()
  {
    mockBroker.Setup(b => b.EnsureContainerAsync(It.IsAny<CancellationToken>())).Returns(ValueTask.CompletedTask);

    await service.EnsureStoreAsync(CancellationToken.None).ConfigureAwait(true);

    mockBroker.Verify(b => b.EnsureContainerAsync(It.IsAny<CancellationToken>()), Times.Once);
  }
  #endregion

  #region CreateRunAsync Tests
  /// <summary>
  /// Verifies that creating a null run is rejected as a validation failure.
  /// </summary>
  [TestMethod]
  public async Task CreateRunAsync_NullRun_ThrowsAnalysisFoundationValidationException() =>
    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.CreateRunAsync(null!, CancellationToken.None)).ConfigureAwait(true);

  /// <summary>
  /// Verifies that a valid run is persisted through the broker and returned.
  /// </summary>
  [TestMethod]
  public async Task CreateRunAsync_ValidRun_ReturnsPersistedRun()
  {
    var run = AnalysisRunTestBuilder.Queued();
    var persisted = run.WithETag("\"etag-1\"");
    mockBroker
      .Setup(b => b.CreateAsync(run, It.IsAny<CancellationToken>()))
      .ReturnsAsync(persisted);

    var result = await service.CreateRunAsync(run, CancellationToken.None).ConfigureAwait(true);

    Assert.AreEqual("\"etag-1\"", result.ETag);
    mockBroker.Verify(b => b.CreateAsync(run, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Verifies that a raw <see cref="CosmosException"/> surfaced by the broker (any status code other than
  /// the specifically-classified 404/412 cases the broker itself translates) is classified as a dependency
  /// failure, not a generic service failure — Cosmos outages/throttling are dependency problems.
  /// </summary>
  [TestMethod]
  public async Task CreateRunAsync_BrokerThrowsCosmosException_ThrowsAnalysisFoundationDependencyException()
  {
    var run = AnalysisRunTestBuilder.Queued();
    var cosmosException = new CosmosException("Request rate is large", System.Net.HttpStatusCode.TooManyRequests, 429, "", 0);
    mockBroker
      .Setup(b => b.CreateAsync(run, It.IsAny<CancellationToken>()))
      .ThrowsAsync(cosmosException);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => service.CreateRunAsync(run, CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<CosmosException>(exception.InnerException);
  }
  #endregion

  #region ClaimNextRunAsync Tests
  /// <summary>
  /// Verifies that a missing lease owner is rejected as a validation failure.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_WhitespaceLeaseOwner_ThrowsAnalysisFoundationValidationException() =>
    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.ClaimNextRunAsync("   ", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None)).ConfigureAwait(true);

  /// <summary>
  /// Verifies that a non-positive lease duration is rejected as a validation failure.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_NonPositiveLeaseDuration_ThrowsAnalysisFoundationValidationException() =>
    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.Zero, CancellationToken.None)).ConfigureAwait(true);

  /// <summary>
  /// Verifies that no claimable run is surfaced as a plain <c>null</c>, not an exception.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_NoClaimableRun_ReturnsNull()
  {
    mockBroker
      .Setup(b => b.ClaimNextAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync((AnalysisRun?)null);

    var result = await service.ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None).ConfigureAwait(true);

    Assert.IsNull(result);
  }

  /// <summary>
  /// Verifies that a claimed run is passed through from the broker unchanged.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_ClaimableRunExists_ReturnsClaimedRun()
  {
    var claimed = AnalysisRunTestBuilder.ActiveRunning();
    mockBroker
      .Setup(b => b.ClaimNextAsync("worker-a", It.IsAny<DateTimeOffset>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(claimed);

    var result = await service.ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None).ConfigureAwait(true);

    Assert.AreEqual(claimed, result);
  }
  #endregion

  #region RenewLeaseAsync Tests
  /// <summary>
  /// Verifies that an empty run identifier is rejected as a validation failure.
  /// </summary>
  [TestMethod]
  public async Task RenewLeaseAsync_EmptyRunId_ThrowsAnalysisFoundationValidationException() =>
    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.RenewLeaseAsync(Guid.Empty, "worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None)).ConfigureAwait(true);

  /// <summary>
  /// Verifies that renewing a lease for a run that does not exist surfaces a dependency validation
  /// failure whose inner exception is <see cref="AnalysisRunNotFoundException"/>.
  /// </summary>
  [TestMethod]
  public async Task RenewLeaseAsync_RunNotFound_ThrowsDependencyValidationWithNotFoundInner()
  {
    var runId = Guid.NewGuid();
    mockBroker
      .Setup(b => b.ReadAsync(runId, It.IsAny<CancellationToken>()))
      .ReturnsAsync((AnalysisRun?)null);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyValidationException>(
      () => service.RenewLeaseAsync(runId, "worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<AnalysisRunNotFoundException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that renewing a lease with a mismatched owner surfaces a dependency validation failure
  /// whose inner exception is <see cref="AnalysisRunLeaseConflictException"/>.
  /// </summary>
  [TestMethod]
  public async Task RenewLeaseAsync_LeaseOwnerMismatch_ThrowsDependencyValidationWithLeaseConflictInner()
  {
    var run = AnalysisRunTestBuilder.ActiveRunning();
    mockBroker
      .Setup(b => b.ReadAsync(run.Id, It.IsAny<CancellationToken>()))
      .ReturnsAsync(run);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyValidationException>(
      () => service.RenewLeaseAsync(run.Id, "some-other-worker", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<AnalysisRunLeaseConflictException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that renewing a lease held by the correct owner extends the lease and replaces the run
  /// using the previously observed ETag as the optimistic-concurrency token.
  /// </summary>
  [TestMethod]
  public async Task RenewLeaseAsync_LeaseOwnerMatches_ReplacesRunWithExtendedLease()
  {
    var run = AnalysisRunTestBuilder.ActiveRunning().WithETag("\"etag-2\"");
    mockBroker.Setup(b => b.ReadAsync(run.Id, It.IsAny<CancellationToken>())).ReturnsAsync(run);

    AnalysisRun? replacedWith = null;
    mockBroker
      .Setup(b => b.ReplaceAsync(It.IsAny<AnalysisRun>(), "\"etag-2\"", It.IsAny<CancellationToken>()))
      .Callback<AnalysisRun, string, CancellationToken>((replacement, _, _) => replacedWith = replacement)
      .ReturnsAsync((AnalysisRun replacement, string _, CancellationToken _) => replacement);

    DateTimeOffset now = DateTimeOffset.UtcNow;
    var result = await service.RenewLeaseAsync(
      run.Id, AnalysisRunTestBuilder.DefaultLeaseOwner, now, TimeSpan.FromMinutes(10), CancellationToken.None).ConfigureAwait(true);

    Assert.AreEqual(now + TimeSpan.FromMinutes(10), result.LeaseExpiresAt);
    Assert.AreEqual(AnalysisRunStatus.Running, result.Status);
    Assert.IsNotNull(replacedWith);
  }
  #endregion

  #region CompleteRunAsync Tests
  /// <summary>
  /// Verifies that a null completed-capabilities collection is rejected as a validation failure.
  /// </summary>
  [TestMethod]
  public async Task CompleteRunAsync_NullCompletedCapabilities_ThrowsAnalysisFoundationValidationException() =>
    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.CompleteRunAsync(Guid.NewGuid(), "worker-a", null!, DateTimeOffset.UtcNow, CancellationToken.None)).ConfigureAwait(true);

  /// <summary>
  /// Verifies that completing a run held by the correct owner transitions it to completed and persists
  /// the change via the broker.
  /// </summary>
  [TestMethod]
  public async Task CompleteRunAsync_LeaseOwnerMatches_ReturnsCompletedRun()
  {
    var run = AnalysisRunTestBuilder.ActiveRunning().WithETag("\"etag-3\"");
    mockBroker.Setup(b => b.ReadAsync(run.Id, It.IsAny<CancellationToken>())).ReturnsAsync(run);
    mockBroker
      .Setup(b => b.ReplaceAsync(It.IsAny<AnalysisRun>(), "\"etag-3\"", It.IsAny<CancellationToken>()))
      .ReturnsAsync((AnalysisRun replacement, string _, CancellationToken _) => replacement);

    var completedAt = DateTimeOffset.UtcNow;
    var result = await service.CompleteRunAsync(
      run.Id, AnalysisRunTestBuilder.DefaultLeaseOwner, [AnalysisCapability.DocumentExtraction], completedAt, CancellationToken.None).ConfigureAwait(true);

    Assert.AreEqual(AnalysisRunStatus.Completed, result.Status);
    Assert.AreEqual(completedAt, result.CompletedAt);
    Assert.AreEqual(AnalysisRun.CompletionTimeToLiveSeconds, result.TimeToLiveSeconds);
  }

  /// <summary>
  /// Verifies that completing a run with a mismatched owner surfaces a lease conflict failure.
  /// </summary>
  [TestMethod]
  public async Task CompleteRunAsync_LeaseOwnerMismatch_ThrowsDependencyValidationWithLeaseConflictInner()
  {
    var run = AnalysisRunTestBuilder.ActiveRunning();
    mockBroker.Setup(b => b.ReadAsync(run.Id, It.IsAny<CancellationToken>())).ReturnsAsync(run);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyValidationException>(
      () => service.CompleteRunAsync(run.Id, "impostor", [], DateTimeOffset.UtcNow, CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<AnalysisRunLeaseConflictException>(exception.InnerException);
  }
  #endregion

  #region FailRunAsync Tests
  /// <summary>
  /// Verifies that a missing failure code is rejected as a validation failure.
  /// </summary>
  [TestMethod]
  public async Task FailRunAsync_WhitespaceFailureCode_ThrowsAnalysisFoundationValidationException() =>
    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.FailRunAsync(Guid.NewGuid(), "worker-a", "  ", DateTimeOffset.UtcNow, CancellationToken.None)).ConfigureAwait(true);

  /// <summary>
  /// Verifies that failing a run held by the correct owner transitions it to failed and persists the
  /// change via the broker.
  /// </summary>
  [TestMethod]
  public async Task FailRunAsync_LeaseOwnerMatches_ReturnsFailedRun()
  {
    var run = AnalysisRunTestBuilder.ActiveRunning().WithETag("\"etag-4\"");
    mockBroker.Setup(b => b.ReadAsync(run.Id, It.IsAny<CancellationToken>())).ReturnsAsync(run);
    mockBroker
      .Setup(b => b.ReplaceAsync(It.IsAny<AnalysisRun>(), "\"etag-4\"", It.IsAny<CancellationToken>()))
      .ReturnsAsync((AnalysisRun replacement, string _, CancellationToken _) => replacement);

    var failedAt = DateTimeOffset.UtcNow;
    var result = await service.FailRunAsync(
      run.Id, AnalysisRunTestBuilder.DefaultLeaseOwner, "boom", failedAt, CancellationToken.None).ConfigureAwait(true);

    Assert.AreEqual(AnalysisRunStatus.Failed, result.Status);
    Assert.AreEqual("boom", result.FailureCode);
    Assert.AreEqual(failedAt, result.FailedAt);
  }
  #endregion

  #region Cancellation Passthrough Tests
  /// <summary>
  /// Verifies that <see cref="AnalysisRunFoundationService.ClaimNextRunAsync"/> propagates
  /// <see cref="OperationCanceledException"/> thrown by the broker without reclassifying it.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_WhenBrokerCancels_PropagatesOperationCanceledException()
  {
    mockBroker
      .Setup(b => b.ClaimNextAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="AnalysisRunFoundationService.CreateRunAsync"/> propagates
  /// <see cref="OperationCanceledException"/> thrown by the broker without reclassifying it.
  /// </summary>
  [TestMethod]
  public async Task CreateRunAsync_WhenBrokerCancels_PropagatesOperationCanceledException()
  {
    var run = AnalysisRunTestBuilder.Queued();
    mockBroker
      .Setup(b => b.CreateAsync(run, It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.CreateRunAsync(run, CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="AnalysisRunFoundationService.RenewLeaseAsync"/> propagates
  /// <see cref="OperationCanceledException"/> thrown by the broker's read call without reclassifying it.
  /// </summary>
  [TestMethod]
  public async Task RenewLeaseAsync_WhenBrokerReadCancels_PropagatesOperationCanceledException()
  {
    mockBroker
      .Setup(b => b.ReadAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.RenewLeaseAsync(Guid.NewGuid(), "worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None)).ConfigureAwait(true);
  }
  #endregion
}
