namespace arolariu.Backend.Domain.Tests.Invoices.Services.Management;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Management;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies Management coordination across CRUD and queue-oriented Analysis Processing.
/// </summary>
[TestClass]
public sealed class InvoiceManagementServiceTests
{
  /// <summary>
  /// Verifies nested forbidden failures retain dependency-validation semantics at the Management boundary.
  /// </summary>
  [TestMethod]
  public async Task QueueMerchantAnalysisAsync_ForbiddenTarget_ThrowsDependencyValidationException()
  {
    Guid merchantId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    var request = new AnalyzeMerchantRequestDto(AnalysisProfile.Fast, null);
    var processing = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    processing.Setup(service => service.QueueMerchantAnalysisAsync(
        merchantId,
        userId,
        request,
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceProcessingServiceException(
        new MerchantForbiddenAccessException(merchantId, userId)));
    var service = new InvoiceManagementService(processing.Object);

    await Assert.ThrowsExactlyAsync<InvoiceManagementDependencyValidationException>(
      () => service.QueueMerchantAnalysisAsync(
        merchantId,
        userId,
        request,
        CancellationToken.None));
  }

  /// <summary>
  /// Verifies queueing delegates to the unified Processing service.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceAnalysisAsync_ValidTarget_DelegatesToProcessing()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    var request = new AnalyzeInvoiceRequestDto(AnalysisProfile.Fast, null);
    var accepted = new AnalysisAcceptedResponseDto("message-1", AnalysisTargetType.Invoice, invoiceId);
    var processing = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    processing.Setup(service => service.QueueInvoiceAnalysisAsync(
        invoiceId,
        userId,
        request,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(accepted);
    var service = new InvoiceManagementService(processing.Object);

    AnalysisAcceptedResponseDto result = await service
      .QueueInvoiceAnalysisAsync(invoiceId, userId, request, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual("message-1", result.MessageId);
    processing.VerifyAll();
  }

  /// <summary>
  /// Verifies queue consumption delegates to the unified Processing service.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextAnalysisAsync_VisibleMessage_ReturnsTrue()
  {
    var processing = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    processing.Setup(service => service.TryExecuteNextAnalysisAsync(It.IsAny<CancellationToken>()))
      .ReturnsAsync(true);
    var service = new InvoiceManagementService(processing.Object);

    bool processed = await service
      .TryExecuteNextAnalysisAsync(CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(processed);
    processing.VerifyAll();
  }

  /// <summary>
  /// Verifies an empty queue result is propagated from Processing.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextAnalysisAsync_NoMessage_ReturnsFalse()
  {
    var processing = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    processing.Setup(service => service.TryExecuteNextAnalysisAsync(It.IsAny<CancellationToken>()))
      .ReturnsAsync(false);
    var service = new InvoiceManagementService(processing.Object);

    bool processed = await service
      .TryExecuteNextAnalysisAsync(CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsFalse(processed);
    processing.VerifyAll();
  }

  /// <summary>
  /// Verifies Processing failures are classified by the Management boundary.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextAnalysisAsync_ProcessingFailure_ThrowsManagementException()
  {
    var processing = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    processing.Setup(service => service.TryExecuteNextAnalysisAsync(It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("processing failed"));
    var service = new InvoiceManagementService(processing.Object);

    await Assert.ThrowsExactlyAsync<
      arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementServiceException>(
      () => service.TryExecuteNextAnalysisAsync(CancellationToken.None));
    processing.VerifyAll();
  }

  private static AnalysisQueueReceipt CreateReceipt(long dequeueCount)
  {
    AnalysisQueueMessage message = AnalysisQueueMessage.CreateInvoice(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      "00-trace-span-01");

    return new AnalysisQueueReceipt(
      message,
      "message-1",
      $"receipt-{dequeueCount}",
      dequeueCount,
      null);
  }

  private static InvoiceAnalysisExecutionResult CreateExecution(
    AnalysisQueueMessage message,
    AnalysisFailureReason? failureReason) =>
    new(
      message,
      new InvoiceAnalysisPatch(null, null, null, null, null, null),
      CompletedCapabilities: [],
      FailureReason: failureReason);
}
