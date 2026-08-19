namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;
using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using Azure;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies the backend-owned Azure Blob and Queue broker boundaries.
/// </summary>
[TestClass]
public sealed class AzureStorageBrokerTests
{
  /// <summary>
  /// Verifies a configured invoices-container URI resolves to its relative blob name without retaining SAS values.
  /// </summary>
  [TestMethod]
  public void ResolveInvoiceBlobName_OwnedBlobWithSas_ReturnsRelativeName()
  {
    var containerUri = new Uri("https://account.blob.core.windows.net/invoices");
    var scanUri = new Uri("https://account.blob.core.windows.net/invoices/user/scan.jpg?sig=secret");

    string blobName = AzureStorageBlobBroker.ResolveInvoiceBlobName(containerUri, scanUri);

    Assert.AreEqual("user/scan.jpg", blobName);
    Assert.IsFalse(blobName.Contains("sig", StringComparison.Ordinal));
  }

  /// <summary>
  /// Verifies a scan outside the backend-owned invoices container is rejected.
  /// </summary>
  [TestMethod]
  public void ResolveInvoiceBlobName_ForeignContainer_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      AzureStorageBlobBroker.ResolveInvoiceBlobName(
        new Uri("https://account.blob.core.windows.net/invoices"),
        new Uri("https://account.blob.core.windows.net/public/scan.jpg")));

  /// <summary>
  /// Verifies enqueueing returns Azure Queue's provider message identifier.
  /// </summary>
  [TestMethod]
  public async Task EnqueueAnalysisAsync_ValidMessage_ReturnsProviderMessageId()
  {
    AnalysisQueueMessage message = CreateMessage();
    var queueClient = new Mock<QueueClient>(MockBehavior.Strict);
    SendReceipt sendReceipt = QueuesModelFactory.SendReceipt(
      "message-1",
      DateTimeOffset.UtcNow,
      DateTimeOffset.UtcNow.AddDays(1),
      "receipt-1",
      DateTimeOffset.UtcNow);

    queueClient
      .Setup(client => client.SendMessageAsync(
        It.IsAny<string>(),
        It.IsAny<TimeSpan?>(),
        It.IsAny<TimeSpan?>(),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(Response.FromValue(sendReceipt, Mock.Of<Response>()));

    var broker = new AzureStorageQueueBroker(queueClient.Object);

    string messageId = await broker
      .EnqueueAnalysisAsync(message, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual("message-1", messageId);
    queueClient.Verify(client => client.SendMessageAsync(
      It.Is<string>(payload => JsonSerializer.Deserialize<AnalysisQueueMessage>(payload) == message),
      null,
      null,
      It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Verifies receiving maps Azure provider receipt information and the application payload.
  /// </summary>
  [TestMethod]
  public async Task ReceiveAnalysisAsync_VisibleMessage_ReturnsMappedReceipt()
  {
    AnalysisQueueMessage message = CreateMessage();
    QueueMessage providerMessage = QueuesModelFactory.QueueMessage(
      "message-1",
      "receipt-1",
      BinaryData.FromString(JsonSerializer.Serialize(message)),
      dequeueCount: 3,
      nextVisibleOn: DateTimeOffset.UtcNow.AddMinutes(2));
    var queueClient = new Mock<QueueClient>(MockBehavior.Strict);

    queueClient
      .Setup(client => client.ReceiveMessagesAsync(
        1,
        TimeSpan.FromMinutes(2),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(Response.FromValue<QueueMessage[]>([providerMessage], Mock.Of<Response>()));

    var broker = new AzureStorageQueueBroker(queueClient.Object);

    AnalysisQueueReceipt? receipt = await broker
      .ReceiveAnalysisAsync(TimeSpan.FromMinutes(2), CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsNotNull(receipt);
    Assert.AreEqual("message-1", receipt.MessageId);
    Assert.AreEqual("receipt-1", receipt.PopReceipt);
    Assert.AreEqual(3, receipt.DequeueCount);
    Assert.AreEqual(message, receipt.Message);
  }

  private static AnalysisQueueMessage CreateMessage() =>
    AnalysisQueueMessage.CreateInvoice(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      "00-trace-span-01");
}
