namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies queue-oriented Analysis Orchestration behavior.
/// </summary>
[TestClass]
public sealed class AnalysisOrchestrationCurrentArchitectureTests
{
  /// <summary>
  /// Verifies enqueueing delegates to the Analysis Queue Foundation.
  /// </summary>
  [TestMethod]
  public async Task EnqueueAnalysisAsync_ValidMessage_ReturnsMessageId()
  {
    AnalysisQueueMessage message = AnalysisQueueMessage.CreateInvoice(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      "00-trace-span-01");
    var queue = new Mock<IAnalysisQueueFoundationService>(MockBehavior.Strict);
    var document = new Mock<IDocumentAnalysisFoundationService>(MockBehavior.Strict);
    var generative = new Mock<IGenerativeAnalysisFoundationService>(MockBehavior.Strict);
    queue.Setup(service => service.EnqueueAsync(message, It.IsAny<CancellationToken>()))
      .ReturnsAsync("message-1");
    var service = new AnalysisOrchestrationService(
      queue.Object,
      document.Object,
      generative.Object,
      NullLoggerFactory.Instance);

    string result = await service
      .EnqueueAnalysisAsync(message, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual("message-1", result);
    queue.VerifyAll();
  }
}
