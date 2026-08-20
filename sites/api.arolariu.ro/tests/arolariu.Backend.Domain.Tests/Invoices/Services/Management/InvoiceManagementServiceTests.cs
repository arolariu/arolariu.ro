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
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.Services.Management;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies Management coordination across CRUD and queue-oriented Analysis Processing.
/// </summary>
[TestClass]
public sealed class InvoiceManagementServiceTests
{
  /// <summary>Verifies Management rejects a missing logger factory dependency.</summary>
  [TestMethod]
  public void Constructor_NullLoggerFactory_ThrowsArgumentNullException()
  {
    Assert.ThrowsExactly<ArgumentNullException>(
      () => new InvoiceManagementService(Mock.Of<IInvoiceProcessingService>(), null!));
  }

  /// <summary>
  /// Verifies nested forbidden failures retain dependency-validation semantics at the Management boundary.
  /// </summary>
  [TestMethod]
  public async Task QueueMerchantAnalysisAsync_ForbiddenTarget_ThrowsDependencyValidationException()
  {
    Guid merchantId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    var request = new MerchantAnalysisRequestDto(
      AnalysisProfile.Fast,
      MerchantClassification: null,
      DescriptionGeneration: null);
    var processing = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    processing.Setup(service => service.QueueMerchantAnalysisAsync(
        merchantId,
        userId,
        request,
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceProcessingServiceException(
        new MerchantForbiddenAccessException(merchantId, userId)));
    var service = new InvoiceManagementService(processing.Object, NullLoggerFactory.Instance);

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
    var request = new InvoiceAnalysisRequestDto(
      AnalysisProfile.Fast,
      DocumentExtraction: null,
      InvoiceSummary: null,
      ProductClassification: null,
      AllergenAssessment: null,
      InvoiceClassification: null,
      RecipeGeneration: null,
      MaximumRecipes: null);
    var processing = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    processing.Setup(service => service.QueueInvoiceAnalysisAsync(
        invoiceId,
        userId,
        request,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync("message-1");
    var service = new InvoiceManagementService(processing.Object, NullLoggerFactory.Instance);

    string result = await service
      .QueueInvoiceAnalysisAsync(invoiceId, userId, request, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual("message-1", result);
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
    var service = new InvoiceManagementService(processing.Object, NullLoggerFactory.Instance);

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
    var service = new InvoiceManagementService(processing.Object, NullLoggerFactory.Instance);

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
    var logger = new Mock<ILogger<IInvoiceManagementService>>();
    logger.Setup(candidate => candidate.IsEnabled(LogLevel.Error)).Returns(true);
    var loggerFactory = new Mock<ILoggerFactory>();
    loggerFactory.Setup(factory => factory.CreateLogger(It.IsAny<string>())).Returns(logger.Object);
    var service = new InvoiceManagementService(processing.Object, loggerFactory.Object);

    await Assert.ThrowsExactlyAsync<
      arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementServiceException>(
      () => service.TryExecuteNextAnalysisAsync(CancellationToken.None));
    processing.VerifyAll();
    logger.Verify(candidate => candidate.Log(
      LogLevel.Error,
      It.IsAny<EventId>(),
      It.Is<It.IsAnyType>((_, _) => true),
      It.IsAny<Exception?>(),
      It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
      Times.Once);
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
