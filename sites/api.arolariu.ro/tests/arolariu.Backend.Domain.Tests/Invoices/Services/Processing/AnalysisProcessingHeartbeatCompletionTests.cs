namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.ObjectModel;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the public heartbeat/execution contract through real processing, orchestration, foundation, and broker
/// boundaries.
/// </summary>
[TestClass]
public sealed class AnalysisProcessingHeartbeatCompletionTests
{
  /// <summary>
  /// Verifies a lease renewal failure observed after target analysis starts prevents every terminal transition.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_RenewalFailsDuringTargetAnalysis_CompletesNoTerminalTransition()
  {
    var scenario = new AnalysisProcessingScenario(TimeSpan.FromMilliseconds(1));
    AnalysisRun run = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.ClaimableRun = run;
    scenario.MerchantResult = MerchantClassificationResult();
    scenario.AnalyzeMerchantDelay = TimeSpan.FromMilliseconds(100);
    scenario.FailLeaseRenewal(new InvalidOperationException("lease stolen during analysis"));

    await Assert.ThrowsExactlyAsync<AnalysisProcessingDependencyException>(
      () => scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None))
      .ConfigureAwait(false);

    Assert.AreEqual(0, scenario.CompletedRuns.Count);
    Assert.AreEqual(0, scenario.FailedRuns.Count);
  }

  /// <summary>
  /// Verifies a successful target analysis keeps the lease alive and reaches a durable completion afterwards.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_TargetAnalysisBlocked_StopsHeartbeatThenCompletesRun()
  {
    var scenario = new AnalysisProcessingScenario(TimeSpan.FromMilliseconds(1));
    AnalysisRun run = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.ClaimableRun = run;
    scenario.MerchantResult = MerchantClassificationResult();
    scenario.AnalyzeMerchantDelay = TimeSpan.FromMilliseconds(100);
    bool processed = await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(processed);
    Assert.AreEqual(1, scenario.CompletedRuns.Count);
    Assert.IsTrue(scenario.Runs.RenewalCount >= 1);
  }

  /// <summary>
  /// Verifies immediate target completion cancels the heartbeat before its first scheduled renewal.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_ImmediateTargetAnalysis_CompletesWithoutLeaseRenewal()
  {
    var scenario = new AnalysisProcessingScenario(TimeSpan.FromSeconds(1));
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.MerchantResult = MerchantClassificationResult();

    bool processed = await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(processed);
    Assert.AreEqual(0, scenario.Runs.RenewalAttemptCount);
    Assert.AreEqual(1, scenario.CompletedRuns.Count);
  }

  /// <summary>
  /// Verifies an external cancellation-shaped renewal failure while work is active is classified as lease loss.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_RenewalDependencyCancels_PropagatesLeaseLoss()
  {
    var scenario = new AnalysisProcessingScenario(TimeSpan.FromMilliseconds(1));
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.MerchantResult = MerchantClassificationResult();
    scenario.AnalyzeMerchantDelay = TimeSpan.FromMilliseconds(100);
    scenario.FailLeaseRenewal(new TaskCanceledException("provider cancelled renewal"));

    await Assert.ThrowsExactlyAsync<AnalysisProcessingDependencyException>(
      () => scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None))
      .ConfigureAwait(false);

    Assert.AreEqual(0, scenario.CompletedRuns.Count);
    Assert.AreEqual(0, scenario.FailedRuns.Count);
  }

  private static MerchantAnalysisResult MerchantClassificationResult() =>
    new(
      new MerchantClassificationResult(
        AnalysisProcessingTestData.Classification(ClassificationSystem.Nace21, "01")),
      DescriptionResult: null,
      new ReadOnlyCollection<AnalysisCapability>([AnalysisCapability.MerchantClassification]));
}
