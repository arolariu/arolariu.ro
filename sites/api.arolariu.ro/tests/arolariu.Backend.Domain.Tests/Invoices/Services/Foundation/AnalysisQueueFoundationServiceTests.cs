namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;

using Azure;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies the analysis queue Foundation boundary.
/// </summary>
[TestClass]
public sealed class AnalysisQueueFoundationServiceTests
{
  /// <summary>Verifies queue initialization creates the queue and confirms provider status.</summary>
  [TestMethod]
  public async Task EnsureQueueAsync_ProvisionedQueue_ConfirmsStatus()
  {
    var broker = new Mock<IQueueBroker>(MockBehavior.Strict);
    broker.Setup(candidate => candidate.CreateQueueIfNotExistsAsync(It.IsAny<CancellationToken>()))
      .Returns(ValueTask.CompletedTask);
    broker.Setup(candidate => candidate.GetQueueStatusAsync(It.IsAny<CancellationToken>()))
      .ReturnsAsync(new QueueStatus(Exists: true, ApproximateMessageCount: 0));
    var service = new AnalysisQueueFoundationService(broker.Object, NullLoggerFactory.Instance);

    await service.EnsureQueueAsync(CancellationToken.None);

    broker.VerifyAll();
  }

  /// <summary>
  /// Verifies enqueueing delegates to the queue broker and returns Azure's message identifier.
  /// </summary>
  [TestMethod]
  public async Task EnqueueAsync_ValidMessage_ReturnsMessageId()
  {
    AnalysisQueueMessage message = CreateMessage();
    var broker = new Mock<IQueueBroker>(MockBehavior.Strict);
    broker
      .Setup(candidate => candidate.EnqueueMessageAsync(message, It.IsAny<CancellationToken>()))
      .ReturnsAsync("message-1");
    var service = new AnalysisQueueFoundationService(broker.Object, NullLoggerFactory.Instance);

    string messageId = await service.EnqueueAsync(message, CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual("message-1", messageId);
    broker.VerifyAll();
  }

  /// <summary>
  /// Verifies Azure dependency failures are classified at the Foundation boundary.
  /// </summary>
  [TestMethod]
  public async Task DequeueAsync_AzureFailure_ThrowsFoundationDependencyException()
  {
    var broker = new Mock<IQueueBroker>(MockBehavior.Strict);
    broker
      .Setup(candidate => candidate.DequeueMessageAsync(
        TimeSpan.FromMinutes(2),
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new RequestFailedException(503, "unavailable"));
    var service = new AnalysisQueueFoundationService(broker.Object, NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => service.DequeueAsync(TimeSpan.FromMinutes(2), CancellationToken.None))
      .ConfigureAwait(false);
  }

  /// <summary>
  /// Verifies cancellation is never reclassified as a dependency failure.
  /// </summary>
  [TestMethod]
  public async Task EnsureQueueAsync_Cancellation_Propagates()
  {
    using var cancellation = new CancellationTokenSource();
    await cancellation.CancelAsync().ConfigureAwait(false);
    var broker = new Mock<IQueueBroker>(MockBehavior.Strict);
    broker
      .Setup(candidate => candidate.CreateQueueIfNotExistsAsync(cancellation.Token))
      .ThrowsAsync(new OperationCanceledException(cancellation.Token));
    var service = new AnalysisQueueFoundationService(broker.Object, NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.EnsureQueueAsync(cancellation.Token))
      .ConfigureAwait(false);
  }

  private static AnalysisQueueMessage CreateMessage() =>
    AnalysisQueueMessage.CreateInvoice(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      "00-trace-span-01");
}
