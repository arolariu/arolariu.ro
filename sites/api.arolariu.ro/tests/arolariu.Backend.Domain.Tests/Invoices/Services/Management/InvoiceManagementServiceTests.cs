namespace arolariu.Backend.Domain.Tests.Invoices.Services.Management;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Management;
using arolariu.Backend.Domain.Invoices.Services.Processing;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies Management coordination across CRUD and queue-oriented Analysis Processing.
/// </summary>
[TestClass]
public sealed class InvoiceManagementServiceTests
{
  /// <summary>
  /// Verifies queueing validates the invoice through CRUD Processing first.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceAnalysisAsync_ValidTarget_ValidatesThenQueues()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    var request = new AnalyzeInvoiceRequestDto(AnalysisProfile.Fast, null);
    var invoice = new Invoice { id = invoiceId, UserIdentifier = userId };
    var accepted = new AnalysisAcceptedResponseDto("message-1", AnalysisTargetType.Invoice, invoiceId);
    var crud = new Mock<ICrudProcessingService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisProcessingService>(MockBehavior.Strict);
    crud.Setup(service => service.ReadInvoice(invoiceId, userId, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    analysis.Setup(service => service.QueueInvoiceAnalysisAsync(
        invoiceId,
        userId,
        request,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(accepted);
    var service = new InvoiceManagementService(crud.Object, analysis.Object);

    AnalysisAcceptedResponseDto result = await service
      .QueueInvoiceAnalysisAsync(invoiceId, userId, request, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual("message-1", result.MessageId);
    crud.VerifyAll();
    analysis.VerifyAll();
  }

  /// <summary>
  /// Verifies a successful analysis attempt persists the patch and deletes the queue message.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextAnalysisAsync_Success_DeletesMessage()
  {
    AnalysisQueueReceipt receipt = CreateReceipt(dequeueCount: 1);
    Invoice invoice = new() { id = receipt.Message.TargetId, UserIdentifier = receipt.Message.RequestedBy };
    InvoiceAnalysisExecutionResult execution = CreateExecution(receipt.Message, failureReason: null);
    var crud = new Mock<ICrudProcessingService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisProcessingService>(MockBehavior.Strict);
    SetupVisibilityScope(analysis, receipt);
    analysis.Setup(service => service.ReceiveNextAnalysisAsync(It.IsAny<CancellationToken>()))
      .ReturnsAsync(receipt);
    crud.Setup(service => service.ReadInvoice(
        receipt.Message.TargetId,
        receipt.Message.RequestedBy,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    analysis.Setup(service => service.ExecuteInvoiceAnalysisAsync(
        receipt.Message,
        invoice,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(execution);
    crud.Setup(service => service.PersistInvoiceAnalysisAsync(
        execution,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(execution);
    analysis.Setup(service => service.DeleteAnalysisAsync(
        receipt,
        null,
        It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);
    var service = new InvoiceManagementService(crud.Object, analysis.Object);

    bool processed = await service
      .TryExecuteNextAnalysisAsync(CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(processed);
    analysis.VerifyAll();
    crud.VerifyAll();
  }

  /// <summary>
  /// Verifies a non-terminal failure remains in the queue for visibility-timeout retry.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextAnalysisAsync_FourthFailure_DoesNotDeleteMessage()
  {
    AnalysisQueueReceipt receipt = CreateReceipt(dequeueCount: 4);
    Invoice invoice = new() { id = receipt.Message.TargetId, UserIdentifier = receipt.Message.RequestedBy };
    InvoiceAnalysisExecutionResult execution = CreateExecution(
      receipt.Message,
      AnalysisFailureReason.Validation);
    var crud = new Mock<ICrudProcessingService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisProcessingService>(MockBehavior.Strict);
    SetupVisibilityScope(analysis, receipt);
    analysis.Setup(service => service.ReceiveNextAnalysisAsync(It.IsAny<CancellationToken>()))
      .ReturnsAsync(receipt);
    crud.Setup(service => service.ReadInvoice(
        receipt.Message.TargetId,
        receipt.Message.RequestedBy,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    analysis.Setup(service => service.ExecuteInvoiceAnalysisAsync(
        receipt.Message,
        invoice,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(execution);
    var service = new InvoiceManagementService(crud.Object, analysis.Object);

    bool processed = await service
      .TryExecuteNextAnalysisAsync(CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(processed);
    analysis.Verify(service => service.DeleteAnalysisAsync(
      It.IsAny<AnalysisQueueReceipt>(),
      It.IsAny<AnalysisFailureReason?>(),
      It.IsAny<CancellationToken>()), Times.Never);
  }

  /// <summary>
  /// Verifies the fifth failed dequeue is logged and deleted.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextAnalysisAsync_FifthFailure_DeletesMessage()
  {
    AnalysisQueueReceipt receipt = CreateReceipt(dequeueCount: 5);
    Invoice invoice = new() { id = receipt.Message.TargetId, UserIdentifier = receipt.Message.RequestedBy };
    InvoiceAnalysisExecutionResult execution = CreateExecution(
      receipt.Message,
      AnalysisFailureReason.Validation);
    var crud = new Mock<ICrudProcessingService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisProcessingService>(MockBehavior.Strict);
    SetupVisibilityScope(analysis, receipt);
    analysis.Setup(service => service.ReceiveNextAnalysisAsync(It.IsAny<CancellationToken>()))
      .ReturnsAsync(receipt);
    crud.Setup(service => service.ReadInvoice(
        receipt.Message.TargetId,
        receipt.Message.RequestedBy,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    analysis.Setup(service => service.ExecuteInvoiceAnalysisAsync(
        receipt.Message,
        invoice,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(execution);
    analysis.Setup(service => service.DeleteAnalysisAsync(
        receipt,
        AnalysisFailureReason.Validation,
        It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);
    var service = new InvoiceManagementService(crud.Object, analysis.Object);

    bool processed = await service
      .TryExecuteNextAnalysisAsync(CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(processed);
    analysis.VerifyAll();
  }

  private static void SetupVisibilityScope(
    Mock<IAnalysisProcessingService> analysis,
    AnalysisQueueReceipt receipt) =>
    analysis.Setup(service => service.ExecuteWithVisibilityRenewalAsync(
        receipt,
        It.IsAny<Func<CancellationToken, Task<AnalysisFailureReason?>>>(),
        It.IsAny<CancellationToken>()))
      .Returns(
        (AnalysisQueueReceipt _, Func<CancellationToken, Task<AnalysisFailureReason?>> operation, CancellationToken token) =>
          operation(token));

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
