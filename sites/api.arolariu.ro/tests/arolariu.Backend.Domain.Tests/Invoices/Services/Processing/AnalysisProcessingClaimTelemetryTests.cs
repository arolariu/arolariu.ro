namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using arolariu.Backend.Domain.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

/// <summary>
/// Verifies queueing, claiming, telemetry branch inputs, completion outcomes, trace identifiers, and cancellation paths.
/// </summary>
[TestClass]
[DoNotParallelize]
public sealed class AnalysisProcessingClaimTelemetryTests
{
  /// <summary>
  /// Verifies queueing without an ambient activity persists a generated non-blank trace identifier.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceAnalysisAsync_NoAmbientActivity_QueuesGeneratedTraceId()
  {
    var scenario = new AnalysisProcessingScenario();

    await scenario.Service.QueueInvoiceAnalysisAsync(
      scenario.Invoice.id,
      scenario.Invoice.UserIdentifier,
      new AnalyzeInvoiceRequestDto(Profile: null, Overrides: null),
      CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual(1, scenario.QueuedTraceIds.Count);
    Assert.IsFalse(string.IsNullOrWhiteSpace(scenario.QueuedTraceIds[0]));
  }

  /// <summary>
  /// Verifies queueing with an ambient activity persists the activity trace identifier rather than creating a blank trace.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceAnalysisAsync_AmbientActivity_QueuesAmbientTraceId()
  {
    var scenario = new AnalysisProcessingScenario();
    using var activity = AnalysisProcessingTestData.StartActivity();

    await scenario.Service.QueueInvoiceAnalysisAsync(
      scenario.Invoice.id,
      scenario.Invoice.UserIdentifier,
      new AnalyzeInvoiceRequestDto(Profile: null, Overrides: null),
      CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual(1, scenario.QueuedTraceIds.Count);
    StringAssert.Contains(scenario.QueuedTraceIds[0], activity.TraceId.ToHexString(), StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies the worker returns false when no run is available to claim, and samples the durable queue depth on
  /// the way out — the drained poll is the cheapest and most informative moment to measure it.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_NoRunAvailable_ReturnsFalse()
  {
    var scenario = new AnalysisProcessingScenario();

    bool processed = await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsFalse(processed);
    Assert.AreEqual(0, scenario.CompletedRuns.Count);
    Assert.AreEqual(2, scenario.Timeline.Count);
    Assert.AreEqual("claim-run", scenario.Timeline[0]);
    Assert.AreEqual("count-pending-runs", scenario.Timeline[1]);
  }

  /// <summary>
  /// Verifies that a successful claim refreshes durable queue depth when the bounded sampling interval is due.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_RunClaimed_RefreshesQueueDepthWhenDue()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateInvoiceRun(scenario.Invoice) with
    {
      TargetType = (AnalysisTargetType)999,
    };

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    CollectionAssert.Contains(scenario.Timeline, "count-pending-runs");
  }

  /// <summary>
  /// Verifies a sustained non-empty queue refreshes on the configured cadence rather than on every successful
  /// claim, using deterministic time rather than wall-clock waits.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_ContinuousSuccessfulClaims_RefreshesQueueDepthAtBoundedInterval()
  {
    var clock = new AnalysisProcessingScenario.ManualTimeProvider(
      new DateTimeOffset(2026, 8, 17, 12, 0, 0, TimeSpan.Zero));
    var scenario = new AnalysisProcessingScenario(
      timeProvider: clock,
      queueDepthRefreshInterval: TimeSpan.FromMinutes(1))
    {
      PendingRunCounts = new Dictionary<AnalysisTargetType, long>
      {
        [AnalysisTargetType.Invoice] = 3L,
        [AnalysisTargetType.Merchant] = 2L,
        [AnalysisTargetType.Product] = 1L,
      },
    };
    scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities([]);

    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    clock.Advance(TimeSpan.FromSeconds(30));
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    clock.Advance(TimeSpan.FromSeconds(31));
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual(2, scenario.Timeline.Count(entry => entry == "count-pending-runs"));
  }

  /// <summary>
  /// Verifies the query throttle is shared by distinct scoped processing-service instances, matching the hosted
  /// worker's one-scope-per-poll lifetime, while each process continues to measure the shared durable queue.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_SeparateScopesWithContinuousBacklog_SharesBoundedRefreshSchedule()
  {
    var clock = new AnalysisProcessingScenario.ManualTimeProvider(
      new DateTimeOffset(2026, 8, 17, 12, 0, 0, TimeSpan.Zero));

    AnalysisProcessingScenario first = await ExecuteClaimInScopeAsync()
      .ConfigureAwait(false);
    Assert.AreEqual(1, first.Timeline.Count(entry => entry == "count-pending-runs"));

    clock.Advance(TimeSpan.FromSeconds(30));
    AnalysisProcessingScenario second = await ExecuteClaimInScopeAsync()
      .ConfigureAwait(false);
    Assert.AreEqual(0, second.Timeline.Count(entry => entry == "count-pending-runs"));

    clock.Advance(TimeSpan.FromSeconds(31));
    AnalysisProcessingScenario third = await ExecuteClaimInScopeAsync()
      .ConfigureAwait(false);
    Assert.AreEqual(1, third.Timeline.Count(entry => entry == "count-pending-runs"));

    async Task<AnalysisProcessingScenario> ExecuteClaimInScopeAsync()
    {
      var scenario = new AnalysisProcessingScenario(
        timeProvider: clock,
        queueDepthRefreshInterval: TimeSpan.FromMinutes(1));
      scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities([]);
      scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);

      await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
        .ConfigureAwait(false);
      return scenario;
    }
  }

  /// <summary>
  /// Verifies the drained poll publishes the sampled depth for every reported target type.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_NoRunAvailable_PublishesSampledQueueDepth()
  {
    InvoiceMetrics.ResetAnalysisQueueDepth();
    try
    {
      var scenario = new AnalysisProcessingScenario
      {
        PendingRunCounts = new Dictionary<AnalysisTargetType, long>
        {
          [AnalysisTargetType.Invoice] = 4L,
          [AnalysisTargetType.Merchant] = 0L,
        },
      };

      using var recorder = new InvoiceMetricRecorder("invoices.analysis.queue.depth");
      await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
        .ConfigureAwait(false);
      recorder.ObserveAll();

      var invoiceDepth = recorder.Measurements.Single(m => InvoiceMetricRecorder.HasTag(m, "target_type", "invoice"));
      var merchantDepth = recorder.Measurements.Single(m => InvoiceMetricRecorder.HasTag(m, "target_type", "merchant"));

      Assert.AreEqual(4L, invoiceDepth.Value);
      Assert.AreEqual(0L, merchantDepth.Value);
    }
    finally
    {
      InvoiceMetrics.ResetAnalysisQueueDepth();
    }
  }

  /// <summary>
  /// Verifies a claimed run whose completed capability count is zero still completes as a partial outcome.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_CompletedCapabilityCountZero_CompletesRun()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities(
      new ReadOnlyCollection<AnalysisCapability>([]));

    bool processed = await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(processed);
    Assert.AreEqual(1, scenario.CompletedRuns.Count);
    Assert.AreEqual(0, scenario.FailedRuns.Count);
  }

  /// <summary>
  /// Verifies a claimed run whose completed capability count is positive completes as a successful outcome.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_CompletedCapabilityCountPositive_CompletesRun()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities(
      new ReadOnlyCollection<AnalysisCapability>([AnalysisCapability.MerchantClassification]));

    bool processed = await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(processed);
    Assert.AreEqual(1, scenario.CompletedRuns.Count);
    Assert.AreEqual(0, scenario.FailedRuns.Count);
  }

  /// <summary>
  /// Verifies reclaiming a previously attempted run executes successfully and exercises the lease-recovery branch.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_PreviouslyAttemptedRun_CompletesRecoveredRun()
  {
    var scenario = new AnalysisProcessingScenario();
    AnalysisRun queued = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    AnalysisRun abandoned = queued.Claim("abandoned-worker", DateTimeOffset.UtcNow.AddMinutes(-5), TimeSpan.FromSeconds(1));
    scenario.ClaimableRun = abandoned;
    scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities(
      new ReadOnlyCollection<AnalysisCapability>([AnalysisCapability.MerchantClassification]));

    bool processed = await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(processed);
    Assert.AreEqual(1, scenario.CompletedRuns.Count);
  }

  /// <summary>
  /// Verifies unsupported target types fail the run and record the failure-outcome path.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_UnsupportedTargetType_FailsRun()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateInvoiceRun(scenario.Invoice) with
    {
      TargetType = (AnalysisTargetType)999,
    };

    bool processed = await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(processed);
    Assert.AreEqual(0, scenario.CompletedRuns.Count);
    Assert.AreEqual(1, scenario.FailedRuns.Count);
  }

  /// <summary>
  /// Verifies cancellation during claimed invoice execution propagates without being classified as a processing fault.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_CancellationDuringExecution_PropagatesCancellation()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateInvoiceRun(scenario.Invoice);
    using var cancellation = new CancellationTokenSource();
    await cancellation.CancelAsync().ConfigureAwait(false);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(async () =>
      await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, cancellation.Token)
        .ConfigureAwait(false)).ConfigureAwait(false);
  }
}
