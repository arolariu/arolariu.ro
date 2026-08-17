namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies target-persistence failure handling in the merchant and invoice worker execution paths: cancellation
/// during the persistence write is rethrown verbatim instead of failing the run, and any other persistence failure
/// explicitly fails the run rather than completing it and silently discarding the analysis output.
/// </summary>
[TestClass]
[DoNotParallelize]
public sealed class AnalysisProcessingPersistenceFailureTests
{
  private const string RunOutcomeInstrument = "invoices.analysis.runs";

  /// <summary>
  /// Verifies a cancelled merchant persistence write propagates cancellation unchanged, without failing the run.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_MerchantPersistenceCancelled_RethrowsWithoutFailingRun()
  {
    var scenario = new AnalysisProcessingScenario();
    AnalysisRun run = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.ClaimableRun = run;
    scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities(run.RequestedCapabilities);
    scenario.Aggregates.UpdateMerchantFailure = new OperationCanceledException("caller cancelled");

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      async () => await scenario.Service
        .TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
        .ConfigureAwait(false)).ConfigureAwait(false);

    Assert.AreEqual(0, scenario.FailedRuns.Count);
    Assert.AreEqual(0, scenario.CompletedRuns.Count);
  }

  /// <summary>
  /// Verifies a general merchant persistence failure explicitly fails the run instead of throwing out of the
  /// worker loop or completing the run despite the lost write.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_MerchantPersistenceFails_FailsRun()
  {
    var scenario = new AnalysisProcessingScenario();
    AnalysisRun run = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.ClaimableRun = run;
    scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities(run.RequestedCapabilities);
    scenario.Aggregates.UpdateMerchantFailure = new InvalidOperationException("cosmos rejected the write");

    bool processed = await scenario.Service
      .TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(processed);
    Assert.AreEqual(0, scenario.CompletedRuns.Count);
    Assert.AreEqual(1, scenario.FailedRuns.Count);
  }

  /// <summary>
  /// Verifies a terminal failure outcome is not emitted when the ETag-conditional failure transition loses its
  /// lease conflict and therefore does not become durable.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_FailRunLeaseConflict_EmitsNoTerminalFailureOutcome()
  {
    var scenario = new AnalysisProcessingScenario();
    AnalysisRun run = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.ClaimableRun = run;
    scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities(run.RequestedCapabilities);
    scenario.Aggregates.UpdateMerchantFailure = new InvalidOperationException("target persistence rejected");
    scenario.Runs.TerminalTransitionFailure = new AnalysisRunLeaseConflictException("stale ETag");

    using var recorder = new InvoiceMetricRecorder(RunOutcomeInstrument);
    await Assert.ThrowsExactlyAsync<AnalysisProcessingDependencyValidationException>(
      () => scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None))
      .ConfigureAwait(false);

    Assert.AreEqual(0, recorder.For(RunOutcomeInstrument).Count);
  }

  /// <summary>
  /// Verifies a cancelled durable failure transition does not emit a terminal failure outcome.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_FailRunCancelled_EmitsNoTerminalFailureOutcome()
  {
    var scenario = new AnalysisProcessingScenario();
    AnalysisRun run = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.ClaimableRun = run;
    scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities(run.RequestedCapabilities);
    scenario.Aggregates.UpdateMerchantFailure = new InvalidOperationException("target persistence rejected");
    scenario.Runs.TerminalTransitionFailure = new OperationCanceledException("failure transition cancelled");

    using var recorder = new InvoiceMetricRecorder(RunOutcomeInstrument);
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None))
      .ConfigureAwait(false);

    Assert.AreEqual(0, recorder.For(RunOutcomeInstrument).Count);
  }

  /// <summary>
  /// Verifies a cancelled invoice persistence write propagates cancellation unchanged, without failing the run.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_InvoicePersistenceCancelled_RethrowsWithoutFailingRun()
  {
    var scenario = new AnalysisProcessingScenario();
    AnalysisRun run = AnalysisProcessingTestData.CreateInvoiceRun(scenario.Invoice);
    scenario.ClaimableRun = run;
    scenario.InvoiceResult = AnalysisProcessingTestData.InvoiceResultWithCompletedCapabilities(run.RequestedCapabilities);
    scenario.Aggregates.UpdateInvoiceFailure = new OperationCanceledException("caller cancelled");

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      async () => await scenario.Service
        .TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
        .ConfigureAwait(false)).ConfigureAwait(false);

    Assert.AreEqual(0, scenario.FailedRuns.Count);
    Assert.AreEqual(0, scenario.CompletedRuns.Count);
  }

  /// <summary>
  /// Verifies an invoice run that carries an explicit target partition identifier reads the invoice through that
  /// partition instead of falling back to the requesting user, exercising the non-null arm of the fallback that
  /// every other invoice-run test - which never sets a partition - leaves untouched.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_InvoiceRunWithExplicitTargetPartition_ReadsThroughThatPartition()
  {
    var scenario = new AnalysisProcessingScenario();
    Guid explicitPartition = Guid.CreateVersion7();
    AnalysisRun run = AnalysisProcessingTestData.CreateInvoiceRun(scenario.Invoice) with
    {
      TargetPartitionIdentifier = explicitPartition,
    };
    scenario.ClaimableRun = run;
    scenario.InvoiceResult = AnalysisProcessingTestData.InvoiceResultWithCompletedCapabilities(run.RequestedCapabilities);

    bool processed = await scenario.Service
      .TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(processed);
    CollectionAssert.Contains(scenario.Aggregates.InvoiceReadPartitions, explicitPartition);
  }
}
