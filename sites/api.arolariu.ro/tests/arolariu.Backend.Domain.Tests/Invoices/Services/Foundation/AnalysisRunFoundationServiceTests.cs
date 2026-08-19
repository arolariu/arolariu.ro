namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
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
  private readonly Mock<IDatabaseBroker> mockBroker;
  private AnalysisRun? lastReplacedRun;
  private readonly AnalysisRunFoundationService service;

  /// <summary>
  /// Initializes test fixtures with a mocked broker for isolated foundation service testing.
  /// </summary>
  public AnalysisRunFoundationServiceTests()
  {
    mockBroker = new Mock<IDatabaseBroker>();
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
    mockBroker.Setup(b => b.EnsureAnalysisQueueAsync(It.IsAny<CancellationToken>())).Returns(ValueTask.CompletedTask);

    await service.EnsureStoreAsync(CancellationToken.None).ConfigureAwait(true);

    mockBroker.Verify(b => b.EnsureAnalysisQueueAsync(It.IsAny<CancellationToken>()), Times.Once);
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
      .Setup(b => b.CreateAnalysisRunAsync(run, It.IsAny<CancellationToken>()))
      .ReturnsAsync(persisted);

    var result = await service.CreateRunAsync(run, CancellationToken.None).ConfigureAwait(true);

    Assert.AreEqual("\"etag-1\"", result.ETag);
    mockBroker.Verify(b => b.CreateAnalysisRunAsync(run, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Verifies that an <see cref="AnalysisRunCosmosDbRateLimitException"/> surfaced by the broker (the typed
  /// exception the database broker produces for a Cosmos HTTP 429 response) is
  /// classified as a dependency-validation failure — a caller-correctable 429, not a generic 503 — and that
  /// the retry-after hint survives the wrap so <c>ExceptionToHttpResultMapper</c> can surface it.
  /// </summary>
  [TestMethod]
  public async Task CreateRunAsync_BrokerThrowsRateLimitException_ThrowsAnalysisFoundationDependencyValidationException()
  {
    var run = AnalysisRunTestBuilder.Queued();
    var rateLimitException = new AnalysisRunCosmosDbRateLimitException(TimeSpan.FromSeconds(3), new InvalidOperationException());
    mockBroker
      .Setup(b => b.CreateAnalysisRunAsync(run, It.IsAny<CancellationToken>()))
      .ThrowsAsync(rateLimitException);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyValidationException>(
      () => service.CreateRunAsync(run, CancellationToken.None)).ConfigureAwait(true);

    var inner = Assert.IsInstanceOfType<AnalysisRunCosmosDbRateLimitException>(exception.InnerException);
    Assert.AreEqual(TimeSpan.FromSeconds(3), inner.RetryAfter);
  }

  /// <summary>
  /// Verifies that a raw <see cref="CosmosException"/> surfaced by the broker for a status code the broker
  /// itself does not translate into a typed inner exception (defense-in-depth fallback — should not normally
  /// leak past <c>CosmosDatabaseBroker</c>) is still classified as a generic dependency failure, not a
  /// generic service failure — Cosmos outages remain dependency problems even when untyped.
  /// </summary>
  [TestMethod]
  public async Task CreateRunAsync_BrokerThrowsUnclassifiedCosmosException_ThrowsAnalysisFoundationDependencyException()
  {
    var run = AnalysisRunTestBuilder.Queued();
    var cosmosException = new CosmosException("Service unavailable", System.Net.HttpStatusCode.ServiceUnavailable, 503, "", 0);
    mockBroker
      .Setup(b => b.CreateAnalysisRunAsync(run, It.IsAny<CancellationToken>()))
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
      .Setup(b => b.StreamAnalysisRunClaimCandidatesAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .Returns(EmptyCandidates());

    var result = await service.ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None).ConfigureAwait(true);

    Assert.IsNull(result);
  }

  /// <summary>
  /// Verifies that a claimable candidate is transitioned and persisted with the candidate's own ETag.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_ClaimableRunExists_ReturnsClaimedRun()
  {
    var candidate = AnalysisRunTestBuilder.Queued();
    lastReplacedRun = null;
    mockBroker
      .Setup(b => b.StreamAnalysisRunClaimCandidatesAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .Returns(Candidates(candidate));
    mockBroker
      .Setup(b => b.ReplaceAnalysisRunAsync(It.IsAny<AnalysisRun>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
      .Returns((AnalysisRun run, string _, CancellationToken _) => Replaced(run));

    var result = await service.ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None).ConfigureAwait(true);

    Assert.IsNotNull(result);
    Assert.AreEqual(lastReplacedRun, result);
    Assert.AreEqual(AnalysisRunStatus.Running, result.Status);
    Assert.AreEqual("worker-a", result.LeaseOwner);
  }

  /// <summary>
  /// Verifies that a candidate whose state moved on between the scan and the claim is skipped, and the next
  /// candidate is claimed instead.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_CandidateNoLongerClaimable_SkipsToNextCandidate()
  {
    var untransitionable = AnalysisRunTestBuilder.Terminal(AnalysisRunStatus.Completed);
    var claimable = AnalysisRunTestBuilder.Queued();
    mockBroker
      .Setup(b => b.StreamAnalysisRunClaimCandidatesAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .Returns(Candidates(untransitionable, claimable));
    mockBroker
      .Setup(b => b.ReplaceAnalysisRunAsync(It.IsAny<AnalysisRun>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
      .Returns((AnalysisRun run, string _, CancellationToken _) => new ValueTask<AnalysisRun>(run));

    var result = await service.ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None).ConfigureAwait(true);

    Assert.IsNotNull(result);
    Assert.AreEqual(claimable.Id, result.Id);
    mockBroker.Verify(
      b => b.ReplaceAnalysisRunAsync(It.IsAny<AnalysisRun>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Verifies that losing the optimistic-concurrency race on one candidate is a benign skip, not a failure.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_ConcurrentWorkerWinsRace_ClaimsNextCandidate()
  {
    var contended = AnalysisRunTestBuilder.Queued();
    var free = AnalysisRunTestBuilder.Queued();
    mockBroker
      .Setup(b => b.StreamAnalysisRunClaimCandidatesAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .Returns(Candidates(contended, free));
    mockBroker
      .Setup(b => b.ReplaceAnalysisRunAsync(It.Is<AnalysisRun>(r => r.Id == contended.Id), It.IsAny<string>(), It.IsAny<CancellationToken>()))
      .Throws(new AnalysisRunLeaseConflictException("contended"));
    mockBroker
      .Setup(b => b.ReplaceAnalysisRunAsync(It.Is<AnalysisRun>(r => r.Id == free.Id), It.IsAny<string>(), It.IsAny<CancellationToken>()))
      .Returns((AnalysisRun run, string _, CancellationToken _) => new ValueTask<AnalysisRun>(run));

    var result = await service.ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None).ConfigureAwait(true);

    Assert.IsNotNull(result);
    Assert.AreEqual(free.Id, result.Id);
  }

  /// <summary>
  /// Verifies that a candidate deleted between the scan and the replace is skipped rather than faulting the claim.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_CandidateVanishes_SkipsToNextCandidate()
  {
    var vanished = AnalysisRunTestBuilder.Queued();
    var free = AnalysisRunTestBuilder.Queued();
    mockBroker
      .Setup(b => b.StreamAnalysisRunClaimCandidatesAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .Returns(Candidates(vanished, free));
    mockBroker
      .Setup(b => b.ReplaceAnalysisRunAsync(It.Is<AnalysisRun>(r => r.Id == vanished.Id), It.IsAny<string>(), It.IsAny<CancellationToken>()))
      .Throws(new AnalysisRunNotFoundException("vanished"));
    mockBroker
      .Setup(b => b.ReplaceAnalysisRunAsync(It.Is<AnalysisRun>(r => r.Id == free.Id), It.IsAny<string>(), It.IsAny<CancellationToken>()))
      .Returns((AnalysisRun run, string _, CancellationToken _) => new ValueTask<AnalysisRun>(run));

    var result = await service.ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None).ConfigureAwait(true);

    Assert.IsNotNull(result);
    Assert.AreEqual(free.Id, result.Id);
  }

  /// <summary>
  /// Verifies that exhausting every candidate without a successful claim yields <c>null</c>.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_AllCandidatesContended_ReturnsNull()
  {
    var first = AnalysisRunTestBuilder.Queued();
    var second = AnalysisRunTestBuilder.Queued();
    mockBroker
      .Setup(b => b.StreamAnalysisRunClaimCandidatesAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .Returns(Candidates(first, second));
    mockBroker
      .Setup(b => b.ReplaceAnalysisRunAsync(It.IsAny<AnalysisRun>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
      .Throws(new AnalysisRunLeaseConflictException("contended"));

    var result = await service.ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None).ConfigureAwait(true);

    Assert.IsNull(result);
  }

  /// <summary>
  /// Verifies that an already-cancelled token stops the claim scan before any candidate is transitioned.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_CancelledToken_PropagatesOperationCanceledExceptionWithoutClaiming()
  {
    using var cts = new CancellationTokenSource();
    await cts.CancelAsync().ConfigureAwait(true);
    mockBroker
      .Setup(b => b.StreamAnalysisRunClaimCandidatesAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .Returns(Candidates(AnalysisRunTestBuilder.Queued()));

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), cts.Token)).ConfigureAwait(true);

    mockBroker.Verify(
      b => b.ReplaceAnalysisRunAsync(It.IsAny<AnalysisRun>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
      Times.Never);
  }
  #endregion

  #region CountPendingRunsAsync Tests
  /// <summary>
  /// Verifies that broker-reported pending counts are surfaced unchanged.
  /// </summary>
  [TestMethod]
  public async Task CountPendingRunsAsync_BrokerReportsCounts_ReturnsThem()
  {
    mockBroker
      .Setup(b => b.CountPendingAnalysisRunsByTargetTypeAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .Returns(() => new ValueTask<IReadOnlyDictionary<AnalysisTargetType, long>>(
        new Dictionary<AnalysisTargetType, long> { [AnalysisTargetType.Invoice] = 7L }));

    var result = await service.CountPendingRunsAsync(DateTimeOffset.UtcNow, CancellationToken.None).ConfigureAwait(true);

    Assert.AreEqual(7L, result[AnalysisTargetType.Invoice]);
  }

  /// <summary>
  /// Verifies that target types absent from the broker projection are reported as an explicit zero, so a drained
  /// queue publishes zero instead of leaving a stale non-zero depth standing.
  /// </summary>
  [TestMethod]
  public async Task CountPendingRunsAsync_TargetTypeAbsentFromProjection_ReportsZero()
  {
    mockBroker
      .Setup(b => b.CountPendingAnalysisRunsByTargetTypeAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .Returns(() => new ValueTask<IReadOnlyDictionary<AnalysisTargetType, long>>(
        new Dictionary<AnalysisTargetType, long> { [AnalysisTargetType.Invoice] = 3L }));

    var result = await service.CountPendingRunsAsync(DateTimeOffset.UtcNow, CancellationToken.None).ConfigureAwait(true);

    foreach (AnalysisTargetType targetType in Enum.GetValues<AnalysisTargetType>())
    {
      Assert.IsTrue(result.ContainsKey(targetType), $"Missing target type {targetType}.");
    }

    Assert.AreEqual(0L, result[AnalysisTargetType.Merchant]);
  }

  /// <summary>
  /// Verifies that a broker failure while counting is classified as a foundation dependency failure.
  /// </summary>
  [TestMethod]
  public async Task CountPendingRunsAsync_BrokerFails_ThrowsAnalysisFoundationServiceException()
  {
    mockBroker
      .Setup(b => b.CountPendingAnalysisRunsByTargetTypeAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .Throws(new InvalidOperationException("count failed"));

    await Assert.ThrowsExactlyAsync<AnalysisFoundationServiceException>(
      () => service.CountPendingRunsAsync(DateTimeOffset.UtcNow, CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that cancellation raised while counting is propagated unchanged.
  /// </summary>
  [TestMethod]
  public async Task CountPendingRunsAsync_WhenBrokerCancels_PropagatesOperationCanceledException()
  {
    mockBroker
      .Setup(b => b.CountPendingAnalysisRunsByTargetTypeAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .Throws(new OperationCanceledException());

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.CountPendingRunsAsync(DateTimeOffset.UtcNow, CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>Records the run handed to the broker replace and echoes it back.</summary>
  /// <param name="run">The run submitted for replacement.</param>
  private ValueTask<AnalysisRun> Replaced(AnalysisRun run)
  {
    lastReplacedRun = run;
    return new ValueTask<AnalysisRun>(run);
  }

  /// <summary>Produces an empty claim-candidate stream.</summary>
  private static async IAsyncEnumerable<AnalysisRun> EmptyCandidates()
  {
    await Task.CompletedTask.ConfigureAwait(false);
    yield break;
  }

  /// <summary>Produces a claim-candidate stream over the supplied runs.</summary>
  /// <param name="runs">The candidates to stream, in scan order.</param>
  private static async IAsyncEnumerable<AnalysisRun> Candidates(params AnalysisRun[] runs)
  {
    foreach (AnalysisRun run in runs)
    {
      await Task.Yield();
      yield return run;
    }
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
      .Setup(b => b.ReadAnalysisRunAsync(runId, It.IsAny<CancellationToken>()))
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
      .Setup(b => b.ReadAnalysisRunAsync(run.Id, It.IsAny<CancellationToken>()))
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
    mockBroker.Setup(b => b.ReadAnalysisRunAsync(run.Id, It.IsAny<CancellationToken>())).ReturnsAsync(run);

    AnalysisRun? replacedWith = null;
    mockBroker
      .Setup(b => b.ReplaceAnalysisRunAsync(It.IsAny<AnalysisRun>(), "\"etag-2\"", It.IsAny<CancellationToken>()))
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
    mockBroker.Setup(b => b.ReadAnalysisRunAsync(run.Id, It.IsAny<CancellationToken>())).ReturnsAsync(run);
    mockBroker
      .Setup(b => b.ReplaceAnalysisRunAsync(It.IsAny<AnalysisRun>(), "\"etag-3\"", It.IsAny<CancellationToken>()))
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
    mockBroker.Setup(b => b.ReadAnalysisRunAsync(run.Id, It.IsAny<CancellationToken>())).ReturnsAsync(run);

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
    mockBroker.Setup(b => b.ReadAnalysisRunAsync(run.Id, It.IsAny<CancellationToken>())).ReturnsAsync(run);
    mockBroker
      .Setup(b => b.ReplaceAnalysisRunAsync(It.IsAny<AnalysisRun>(), "\"etag-4\"", It.IsAny<CancellationToken>()))
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
      .Setup(b => b.StreamAnalysisRunClaimCandidatesAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .Throws(new OperationCanceledException());

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
      .Setup(b => b.CreateAnalysisRunAsync(run, It.IsAny<CancellationToken>()))
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
      .Setup(b => b.ReadAnalysisRunAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.RenewLeaseAsync(Guid.NewGuid(), "worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="AnalysisRunFoundationService.EnsureStoreAsync"/> propagates
  /// <see cref="OperationCanceledException"/> thrown by the broker without reclassifying it.
  /// </summary>
  [TestMethod]
  public async Task EnsureStoreAsync_WhenBrokerCancels_PropagatesOperationCanceledException()
  {
    mockBroker
      .Setup(b => b.EnsureAnalysisQueueAsync(It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.EnsureStoreAsync(CancellationToken.None)).ConfigureAwait(true);
  }
  #endregion
}
