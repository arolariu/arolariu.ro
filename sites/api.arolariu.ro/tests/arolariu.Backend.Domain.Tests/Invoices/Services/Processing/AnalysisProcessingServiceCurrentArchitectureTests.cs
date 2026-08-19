namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.ClassificationService;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies the current analysis-processing boundary that queues, claims, and completes immutable analysis runs.
/// </summary>
[TestClass]
public sealed class AnalysisProcessingServiceCurrentArchitectureTests
{
  /// <summary>
  /// Verifies invoice queueing resolves options and delegates durable run creation to analysis orchestration.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceAnalysisAsync_ValidRequest_QueuesRun()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userIdentifier = Guid.NewGuid();
    var request = new AnalyzeInvoiceRequestDto(AnalysisProfile.Fast, Overrides: null);
    AnalysisRun queuedRun = AnalysisRun.CreateInvoice(invoiceId, userIdentifier, Guid.NewGuid(), InvoiceAnalysisOptions.Fast(), traceParent: "trace");

    var classification = new Mock<IClassificationOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);

    analysis.Setup(service => service.QueueInvoiceRunAsync(
        invoiceId,
        userIdentifier,
        It.Is<InvoiceAnalysisOptions>(options => options.Profile == AnalysisProfile.Fast),
        It.Is<string>(traceId => !string.IsNullOrWhiteSpace(traceId)),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(queuedRun);

    var service = new AnalysisProcessingService(classification.Object, analysis.Object, NullLoggerFactory.Instance);

    AnalysisAcceptedResponseDto result = await service
      .QueueInvoiceAnalysisAsync(invoiceId, userIdentifier, request, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual(queuedRun.Id, result.RunId);
    analysis.VerifyAll();
  }

  /// <summary>
  /// Verifies claiming a run delegates to analysis orchestration and refreshes queue depth once due.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_WhenRunExists_ReturnsClaimedRun()
  {
    AnalysisRun run = AnalysisRun.CreateInvoice(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      traceParent: null);

    var classification = new Mock<IClassificationOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);

    analysis.Setup(service => service.ClaimNextRunAsync(
        "worker-1",
        It.IsAny<DateTimeOffset>(),
        It.IsAny<TimeSpan>(),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(run);

    analysis.Setup(service => service.CountPendingRunsAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(new Dictionary<AnalysisTargetType, long>());

    var service = new AnalysisProcessingService(classification.Object, analysis.Object, NullLoggerFactory.Instance);

    AnalysisRun? claimed = await service
      .ClaimNextRunAsync("worker-1", CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreSame(run, claimed);
    analysis.Verify(service => service.CountPendingRunsAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Verifies a successful immutable execution result is terminally completed through orchestration.
  /// </summary>
  [TestMethod]
  public async Task CompleteRunExecutionAsync_SuccessResult_CompletesRun()
  {
    AnalysisRun run = AnalysisRun.CreateInvoice(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      traceParent: null);

    var execution = new InvoiceAnalysisExecutionResult(
      run,
      new InvoiceAnalysisPatch(
        ExtractionUpdate: null,
        MerchantReferenceUpdate: null,
        SummaryUpdate: new InvoiceSummaryResult("Summary", "Description"),
        ProductClassificationUpdate: null,
        AllergenAssessmentUpdate: null,
        InvoiceClassificationUpdate: null,
        RecipeGenerationUpdate: null),
      MerchantCandidate: null,
      CompletedCapabilities: [AnalysisCapability.InvoiceSummary]);

    var classification = new Mock<IClassificationOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);

    analysis.Setup(service => service.CompleteRunAsync(
        run.Id,
        "worker-1",
        execution.CompletedCapabilities,
        It.IsAny<DateTimeOffset>(),
        It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);

    var service = new AnalysisProcessingService(classification.Object, analysis.Object, NullLoggerFactory.Instance);

    await service
      .CompleteRunExecutionAsync(execution, "worker-1", CancellationToken.None)
      .ConfigureAwait(false);

    analysis.VerifyAll();
  }

  /// <summary>
  /// Verifies lease renewal remains active for the complete caller-supplied execution scope.
  /// </summary>
  [TestMethod]
  public async Task ExecuteWithLeaseHeartbeatAsync_LongRunningOperation_RenewsLeaseBeforeCompletion()
  {
    AnalysisRun run = AnalysisRun.CreateInvoice(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      traceParent: null);
    var renewalObserved = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    var classification = new Mock<IClassificationOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);

    analysis.Setup(service => service.RenewRunLeaseAsync(
        run.Id,
        "worker-1",
        It.IsAny<DateTimeOffset>(),
        It.IsAny<TimeSpan>(),
        It.IsAny<CancellationToken>()))
      .Callback(() => renewalObserved.TrySetResult())
      .Returns(Task.CompletedTask);

    var service = new AnalysisProcessingService(
      classification.Object,
      analysis.Object,
      NullLoggerFactory.Instance,
      renewalInterval: TimeSpan.FromMilliseconds(10),
      leaseDuration: TimeSpan.FromMinutes(1));

    int result = await service
      .ExecuteWithLeaseHeartbeatAsync(
        run,
        "worker-1",
        async cancellationToken =>
        {
          await renewalObserved.Task.WaitAsync(TimeSpan.FromSeconds(1), cancellationToken).ConfigureAwait(false);
          return 42;
        },
        CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual(42, result);
    analysis.Verify(
      service => service.RenewRunLeaseAsync(
        run.Id,
        "worker-1",
        It.IsAny<DateTimeOffset>(),
        It.IsAny<TimeSpan>(),
        It.IsAny<CancellationToken>()),
      Times.AtLeastOnce);
  }
}
