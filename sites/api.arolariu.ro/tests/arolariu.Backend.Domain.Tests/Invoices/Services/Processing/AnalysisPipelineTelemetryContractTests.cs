namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the analysis pipeline's telemetry contract against real production call paths rather than against
/// direct instrument invocations.
/// </summary>
/// <remarks>
/// These tests encode three correctness properties that a purely additive telemetry wave got wrong:
/// terminal outcomes must reflect completed-versus-requested capabilities, a recoverable lease loss must not be
/// reported as a terminal run outcome, and queue telemetry must not drift across claim/reclaim cycles.
/// </remarks>
[TestClass]
[DoNotParallelize]
public sealed class AnalysisPipelineTelemetryContractTests
{
  private const string RunOutcomeInstrument = "invoices.analysis.runs";
  private const string LeaseLostInstrument = "invoices.analysis.lease.lost";
  private const string LeaseRecoveredInstrument = "invoices.analysis.lease.recovered";
  private const string QueueWaitInstrument = "invoices.analysis.queue.wait";
  private const string QueueDepthInstrument = "invoices.analysis.queue.depth";
  private const string OutcomeTag = "outcome";

  /// <summary>
  /// Verifies a run whose capabilities all produced output reports a success outcome.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_AllRequestedCapabilitiesCompleted_ReportsSuccess()
  {
    IReadOnlyList<InvoiceMetricRecorder.CapturedMeasurement> outcomes = await RunInvoiceScenarioAsync(
      InvoiceAnalysisOptions.Fast(),
      completed: RequestedOf(InvoiceAnalysisOptions.Fast())).ConfigureAwait(false);

    Assert.AreEqual(1, outcomes.Count);
    InvoiceMetricRecorder.AssertTag(outcomes[0], OutcomeTag, "success");
  }

  /// <summary>
  /// Verifies a run where only some requested capabilities produced output reports a partial outcome.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_SomeRequestedCapabilitiesCompleted_ReportsPartial()
  {
    InvoiceAnalysisOptions options = InvoiceAnalysisOptions.Comprehensive();
    IReadOnlyCollection<AnalysisCapability> requested = RequestedOf(options);
    Assert.IsTrue(requested.Count > 1, "The comprehensive profile must request more than one capability.");

    IReadOnlyList<InvoiceMetricRecorder.CapturedMeasurement> outcomes = await RunInvoiceScenarioAsync(
      options,
      completed: [requested.First()]).ConfigureAwait(false);

    Assert.AreEqual(1, outcomes.Count);
    InvoiceMetricRecorder.AssertTag(outcomes[0], OutcomeTag, "partial");
  }

  /// <summary>
  /// Verifies a run where no requested capability produced output reports a failure outcome.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_NoRequestedCapabilityCompleted_ReportsFailure()
  {
    IReadOnlyList<InvoiceMetricRecorder.CapturedMeasurement> outcomes = await RunInvoiceScenarioAsync(
      InvoiceAnalysisOptions.Comprehensive(),
      completed: []).ConfigureAwait(false);

    Assert.AreEqual(1, outcomes.Count);
    InvoiceMetricRecorder.AssertTag(outcomes[0], OutcomeTag, "failure");
  }

  /// <summary>
  /// Verifies a merchant run where no requested capability produced output reports a failure outcome.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_MerchantRunWithNoCompletedCapabilities_ReportsFailure()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisRun.CreateMerchant(
      scenario.Merchant.id,
      Guid.CreateVersion7(),
      Guid.CreateVersion7(),
      scenario.Merchant.ParentCompanyId,
      MerchantAnalysisOptions.Comprehensive(),
      "trace");
    scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities(
      new ReadOnlyCollection<AnalysisCapability>([]));

    using var recorder = new InvoiceMetricRecorder(RunOutcomeInstrument);
    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None).ConfigureAwait(false);

    IReadOnlyList<InvoiceMetricRecorder.CapturedMeasurement> outcomes = recorder.For(RunOutcomeInstrument);
    Assert.AreEqual(1, outcomes.Count);
    InvoiceMetricRecorder.AssertTag(outcomes[0], OutcomeTag, "failure");
  }

  /// <summary>
  /// Verifies a merchant run where every requested capability produced output reports a success outcome.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_MerchantRunWithAllCompletedCapabilities_ReportsSuccess()
  {
    var scenario = new AnalysisProcessingScenario();
    MerchantAnalysisOptions options = MerchantAnalysisOptions.Comprehensive();
    AnalysisRun run = AnalysisRun.CreateMerchant(
      scenario.Merchant.id,
      Guid.CreateVersion7(),
      Guid.CreateVersion7(),
      scenario.Merchant.ParentCompanyId,
      options,
      "trace");
    scenario.ClaimableRun = run;
    scenario.MerchantResult = AnalysisProcessingTestData.CompleteMerchantResult();

    using var recorder = new InvoiceMetricRecorder(RunOutcomeInstrument);
    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None).ConfigureAwait(false);

    IReadOnlyList<InvoiceMetricRecorder.CapturedMeasurement> outcomes = recorder.For(RunOutcomeInstrument);
    Assert.AreEqual(1, outcomes.Count);
    InvoiceMetricRecorder.AssertTag(outcomes[0], OutcomeTag, "success");
  }

  /// <summary>
  /// Verifies losing an in-flight lease emits the dedicated lease-loss signal and no terminal run outcome, because
  /// the run remains re-claimable and a later worker owns its terminal transition.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_LeaseLost_EmitsLeaseLostWithoutTerminalRunOutcome()
  {
    var scenario = new AnalysisProcessingScenario(renewalInterval: TimeSpan.FromMilliseconds(10));
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities(
      new ReadOnlyCollection<AnalysisCapability>([]));
    scenario.AnalyzeMerchantDelay = TimeSpan.FromMilliseconds(400);
    scenario.FailLeaseRenewal(new InvalidOperationException("lease stolen"));

    using var recorder = new InvoiceMetricRecorder(RunOutcomeInstrument, LeaseLostInstrument);
    await Assert.ThrowsExactlyAsync<AnalysisProcessingDependencyException>(
      async () => await scenario.Service
        .TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
        .ConfigureAwait(false)).ConfigureAwait(false);

    Assert.AreEqual(1, recorder.For(LeaseLostInstrument).Count, "Lease loss must emit exactly one lease-lost measurement.");
    Assert.AreEqual(
      0,
      recorder.For(RunOutcomeInstrument).Count,
      "A recoverable lease loss is not a terminal run transition and must not emit a run outcome.");
  }

  /// <summary>
  /// Verifies the full enqueue, claim, lease-loss, reclaim, completion cycle emits exactly one terminal run
  /// outcome and records a non-negative queue wait for each claim.
  /// </summary>
  [TestMethod]
  public async Task AnalysisLifecycle_EnqueueClaimLoseLeaseReclaimComplete_EmitsSingleTerminalOutcome()
  {
    var scenario = new AnalysisProcessingScenario(renewalInterval: TimeSpan.FromMilliseconds(10));
    AnalysisRun queued = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);

    using var recorder = new InvoiceMetricRecorder(
      RunOutcomeInstrument,
      LeaseLostInstrument,
      LeaseRecoveredInstrument,
      QueueWaitInstrument,
      QueueDepthInstrument);

    // First claim: the worker loses the lease mid-flight, so the run stays re-claimable.
    scenario.ClaimableRun = queued;
    scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities(
      new ReadOnlyCollection<AnalysisCapability>([]));
    scenario.AnalyzeMerchantDelay = TimeSpan.FromMilliseconds(400);
    scenario.FailLeaseRenewal(new InvalidOperationException("lease stolen"));

    await Assert.ThrowsExactlyAsync<AnalysisProcessingDependencyException>(
      async () => await scenario.Service
        .TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
        .ConfigureAwait(false)).ConfigureAwait(false);

    Assert.AreEqual(0, recorder.For(RunOutcomeInstrument).Count, "Lease loss must not close the run.");

    // Second claim: a healthy worker recovers the expired lease and drives the run to completion.
    scenario.ClearLeaseRenewalFailure();
    scenario.AnalyzeMerchantDelay = TimeSpan.Zero;
    MerchantAnalysisOptions options = MerchantAnalysisOptions.Comprehensive();
    AnalysisRun reclaimable = AnalysisRun.CreateMerchant(
      scenario.Merchant.id,
      Guid.CreateVersion7(),
      Guid.CreateVersion7(),
      scenario.Merchant.ParentCompanyId,
      options,
      "trace") with
    {
      AttemptCount = 1,
    };
    scenario.ClaimableRun = reclaimable;
    scenario.MerchantResult = AnalysisProcessingTestData.CompleteMerchantResult();

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None).ConfigureAwait(false);

    IReadOnlyList<InvoiceMetricRecorder.CapturedMeasurement> outcomes = recorder.For(RunOutcomeInstrument);
    Assert.AreEqual(1, outcomes.Count, "Exactly one terminal outcome must be emitted across the whole lifecycle.");
    InvoiceMetricRecorder.AssertTag(outcomes[0], OutcomeTag, "success");

    Assert.AreEqual(1, recorder.For(LeaseLostInstrument).Count);
    Assert.AreEqual(1, recorder.For(LeaseRecoveredInstrument).Count, "The reclaim must be reported as a lease recovery.");

    foreach (InvoiceMetricRecorder.CapturedMeasurement wait in recorder.For(QueueWaitInstrument))
    {
      Assert.IsTrue(Convert.ToDouble(wait.Value, System.Globalization.CultureInfo.InvariantCulture) >= 0d);
    }
  }

  /// <summary>
  /// Verifies queue wait is only reported for a run's first claim, so recovering an expired lease does not poison
  /// the first-queue wait distribution with the whole elapsed run lifetime.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_ReclaimedRun_DoesNotReportFirstQueueWait()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant) with
    {
      AttemptCount = 3,
      AcceptedAt = DateTimeOffset.UtcNow.AddHours(-5),
    };
    scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities(
      new ReadOnlyCollection<AnalysisCapability>([]));

    using var recorder = new InvoiceMetricRecorder(QueueWaitInstrument, LeaseRecoveredInstrument);
    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual(
      0,
      recorder.For(QueueWaitInstrument).Count,
      "Queue wait measures time from acceptance to first claim; a reclaim must not contribute to it.");
    Assert.AreEqual(1, recorder.For(LeaseRecoveredInstrument).Count);
  }

  /// <summary>
  /// Verifies the first claim of a run reports its queue wait exactly once.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_FirstClaim_ReportsQueueWaitOnce()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities(
      new ReadOnlyCollection<AnalysisCapability>([]));

    using var recorder = new InvoiceMetricRecorder(QueueWaitInstrument, LeaseRecoveredInstrument);
    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual(1, recorder.For(QueueWaitInstrument).Count);
    Assert.AreEqual(0, recorder.For(LeaseRecoveredInstrument).Count);
  }

  private static IReadOnlyCollection<AnalysisCapability> RequestedOf(InvoiceAnalysisOptions options) =>
    AnalysisRun.CreateInvoice(Guid.CreateVersion7(), Guid.CreateVersion7(), Guid.CreateVersion7(), options, "trace").RequestedCapabilities;

  private static async Task<IReadOnlyList<InvoiceMetricRecorder.CapturedMeasurement>> RunInvoiceScenarioAsync(
    InvoiceAnalysisOptions options,
    IReadOnlyCollection<AnalysisCapability> completed)
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisRun.CreateInvoice(
      scenario.Invoice.id,
      scenario.Invoice.UserIdentifier,
      Guid.CreateVersion7(),
      options,
      "trace");
    scenario.InvoiceResult = completed.Count switch
    {
      0 => AnalysisProcessingTestData.InvoiceResultWithCompletedCapabilities(completed),
      _ when options.Profile == AnalysisProfile.Comprehensive => new InvoiceAnalysisResult(
        AnalysisProcessingTestData.CreateExtraction(AnalysisProcessingTestData.ExtractedProduct("Milk", "MILK-1")),
        MerchantCandidateResult: null,
        SummaryResult: null,
        ProductClassificationResult: null,
        AllergenAssessmentResult: null,
        InvoiceClassificationResult: null,
        RecipeGenerationResult: null,
        completed),
      _ => AnalysisProcessingTestData.CompleteInvoiceResult(),
    };

    using var recorder = new InvoiceMetricRecorder(RunOutcomeInstrument);
    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None).ConfigureAwait(false);

    return recorder.For(RunOutcomeInstrument);
  }
}
