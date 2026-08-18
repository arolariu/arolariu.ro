namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies invoice analysis processing activities record expected tags when an invoice ActivityListener is present.
/// </summary>
[TestClass]
[DoNotParallelize]
public sealed class AnalysisProcessingActivityTests
{
  /// <summary>
  /// Verifies invoice analysis queueing records target and run identifiers on the processing activity.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceAnalysisAsync_RecorderActive_RecordsQueueTags()
  {
    var scenario = new AnalysisProcessingScenario();
    using var recorder = new InvoiceActivityRecorder();

    AnalysisAcceptedResponseDto response = await scenario.Service.QueueInvoiceAnalysisAsync(
      scenario.Invoice.id,
      scenario.Invoice.UserIdentifier,
      new AnalyzeInvoiceRequestDto(Profile: null, Overrides: null),
      CancellationToken.None).ConfigureAwait(false);

    Activity activity = RequireActivity(recorder, nameof(scenario.Service.QueueInvoiceAnalysisAsync));
    Assert.AreEqual(nameof(AnalysisTargetType.Invoice), InvoiceActivityRecorder.TagValue(activity, "analysis.target_type"));
    Assert.AreEqual(scenario.Invoice.id.ToString(), InvoiceActivityRecorder.TagValue(activity, "analysis.target_id"));
    Assert.AreEqual(response.RunId.ToString(), InvoiceActivityRecorder.TagValue(activity, "analysis.run_id"));
  }

  /// <summary>
  /// Verifies merchant analysis queueing records target and run identifiers on the processing activity.
  /// </summary>
  [TestMethod]
  public async Task QueueMerchantAnalysisAsync_RecorderActive_RecordsQueueTags()
  {
    var scenario = new AnalysisProcessingScenario();
    using var recorder = new InvoiceActivityRecorder();

    AnalysisAcceptedResponseDto response = await scenario.Service.QueueMerchantAnalysisAsync(
      scenario.Merchant.id,
      Guid.CreateVersion7(),
      new AnalyzeMerchantRequestDto(Profile: null, Overrides: null),
      CancellationToken.None).ConfigureAwait(false);

    Activity activity = RequireActivity(recorder, nameof(scenario.Service.QueueMerchantAnalysisAsync));
    Assert.AreEqual(nameof(AnalysisTargetType.Merchant), InvoiceActivityRecorder.TagValue(activity, "analysis.target_type"));
    Assert.AreEqual(scenario.Merchant.id.ToString(), InvoiceActivityRecorder.TagValue(activity, "analysis.target_id"));
    Assert.AreEqual(response.RunId.ToString(), InvoiceActivityRecorder.TagValue(activity, "analysis.run_id"));
  }

  /// <summary>
  /// Verifies an empty durable queue records the unclaimed worker activity tag.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_NoRunAvailable_RecordsUnclaimedTag()
  {
    var scenario = new AnalysisProcessingScenario();
    using var recorder = new InvoiceActivityRecorder();

    bool processed = await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Activity activity = RequireActivity(recorder, nameof(scenario.Service.TryExecuteNextRunAsync));
    Assert.IsFalse(processed);
    Assert.AreEqual("False", InvoiceActivityRecorder.TagValue(activity, "analysis.claimed"));
  }

  /// <summary>
  /// Verifies a claimed invoice run records worker and invoice execution activity tags.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_InvoiceRunClaimed_RecordsClaimAndInvoiceExecutionTags()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateInvoiceRun(scenario.Invoice);
    scenario.InvoiceResult = AnalysisProcessingTestData.InvoiceResultWithCompletedCapabilities(
      new ReadOnlyCollection<AnalysisCapability>([]));
    using var recorder = new InvoiceActivityRecorder();

    bool processed = await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Activity workerActivity = RequireActivity(recorder, nameof(scenario.Service.TryExecuteNextRunAsync));
    Activity invoiceActivity = RequireActivity(recorder, "ExecuteInvoiceRunAsync");
    Assert.IsTrue(processed);
    Assert.AreEqual("True", InvoiceActivityRecorder.TagValue(workerActivity, "analysis.claimed"));
    Assert.AreEqual(scenario.CompletedRuns[0].ToString(), InvoiceActivityRecorder.TagValue(workerActivity, "analysis.run_id"));
    Assert.AreEqual(nameof(AnalysisTargetType.Invoice), InvoiceActivityRecorder.TagValue(workerActivity, "analysis.target_type"));
    Assert.AreEqual(scenario.CompletedRuns[0].ToString(), InvoiceActivityRecorder.TagValue(invoiceActivity, "analysis.run_id"));
    Assert.AreEqual(scenario.Invoice.id.ToString(), InvoiceActivityRecorder.TagValue(invoiceActivity, "analysis.target_id"));
    Assert.AreEqual("False", InvoiceActivityRecorder.TagValue(invoiceActivity, "analysis.patch_has_changes"));
  }

  /// <summary>
  /// Verifies a claimed merchant run records merchant execution activity tags.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_MerchantRunClaimed_RecordsMerchantExecutionTags()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.MerchantResult = AnalysisProcessingTestData.MerchantResultWithCompletedCapabilities(
      new ReadOnlyCollection<AnalysisCapability>([]));
    using var recorder = new InvoiceActivityRecorder();

    bool processed = await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Activity activity = RequireActivity(recorder, "ExecuteMerchantRunAsync");
    Assert.IsTrue(processed);
    Assert.AreEqual(scenario.CompletedRuns[0].ToString(), InvoiceActivityRecorder.TagValue(activity, "analysis.run_id"));
    Assert.AreEqual(scenario.Merchant.id.ToString(), InvoiceActivityRecorder.TagValue(activity, "analysis.target_id"));
    Assert.AreEqual("False", InvoiceActivityRecorder.TagValue(activity, "analysis.patch_has_changes"));
  }

  private static Activity RequireActivity(InvoiceActivityRecorder recorder, string operationName)
  {
    Activity? activity = recorder.FindActivity(operationName);

    if (activity is not null)
    {
      return activity;
    }

    throw new AssertFailedException($"Activity '{operationName}' was not recorded.");
  }
}
