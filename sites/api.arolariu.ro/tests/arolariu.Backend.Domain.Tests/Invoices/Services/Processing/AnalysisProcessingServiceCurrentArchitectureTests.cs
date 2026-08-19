namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.ClassificationService;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies queue-oriented analysis Processing behavior.
/// </summary>
[TestClass]
public sealed class AnalysisProcessingServiceCurrentArchitectureTests
{
  /// <summary>
  /// Verifies invoice queueing resolves options and returns Azure Queue's message identifier.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceAnalysisAsync_ValidRequest_ReturnsMessageId()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userIdentifier = Guid.NewGuid();
    var request = new AnalyzeInvoiceRequestDto(AnalysisProfile.Fast, Overrides: null);
    var classification = new Mock<IClassificationOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);

    analysis.Setup(service => service.EnqueueAnalysisAsync(
        It.Is<AnalysisQueueMessage>(message =>
          message.TargetId == invoiceId
          && message.RequestedBy == userIdentifier
          && message.InvoiceOptions!.Profile == AnalysisProfile.Fast),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync("message-1");

    var service = new AnalysisProcessingService(
      classification.Object,
      analysis.Object,
      NullLoggerFactory.Instance);

    AnalysisAcceptedResponseDto result = await service
      .QueueInvoiceAnalysisAsync(invoiceId, userIdentifier, request, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual("message-1", result.MessageId);
    analysis.VerifyAll();
  }

  /// <summary>
  /// Verifies receiving delegates with the configured visibility timeout.
  /// </summary>
  [TestMethod]
  public async Task ReceiveNextAnalysisAsync_VisibleMessage_ReturnsReceipt()
  {
    AnalysisQueueReceipt receipt = CreateReceipt();
    var classification = new Mock<IClassificationOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.ReceiveAnalysisAsync(
        TimeSpan.FromMinutes(2),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(receipt);
    var service = new AnalysisProcessingService(
      classification.Object,
      analysis.Object,
      NullLoggerFactory.Instance);

    AnalysisQueueReceipt? result = await service
      .ReceiveNextAnalysisAsync(CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreSame(receipt, result);
  }

  /// <summary>
  /// Verifies visibility renewal remains active while Management executes its callback.
  /// </summary>
  [TestMethod]
  public async Task ExecuteWithVisibilityRenewalAsync_LongOperation_RenewsVisibility()
  {
    AnalysisQueueReceipt receipt = CreateReceipt();
    var renewalObserved = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    var classification = new Mock<IClassificationOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.RenewAnalysisVisibilityAsync(
        receipt,
        TimeSpan.FromMinutes(1),
        It.IsAny<CancellationToken>()))
      .Callback(() => renewalObserved.TrySetResult())
      .ReturnsAsync(receipt);
    var service = new AnalysisProcessingService(
      classification.Object,
      analysis.Object,
      NullLoggerFactory.Instance,
      TimeSpan.FromMilliseconds(10),
      TimeSpan.FromMinutes(1));

    int result = await service.ExecuteWithVisibilityRenewalAsync(
      receipt,
      async cancellationToken =>
      {
        await renewalObserved.Task.WaitAsync(TimeSpan.FromSeconds(1), cancellationToken).ConfigureAwait(false);
        return 42;
      },
      CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual(42, result);
    analysis.VerifyAll();
  }

  private static AnalysisQueueReceipt CreateReceipt()
  {
    AnalysisQueueMessage message = AnalysisQueueMessage.CreateInvoice(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      "00-trace-span-01");

    return new AnalysisQueueReceipt(message, "message-1", "receipt-1", 1, null);
  }
}
