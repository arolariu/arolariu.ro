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

  /// <summary>
  /// Verifies malformed payloads retain provider receipt metadata for bounded retry and deletion.
  /// </summary>
  [TestMethod]
  public async Task ReceiveAnalysisAsync_MalformedPayload_ReturnsMalformedReceipt()
  {
    const string malformedPayload = "{not-json";
    QueueMessage providerMessage = QueuesModelFactory.QueueMessage(
      "message-1",
      "receipt-1",
      BinaryData.FromString(malformedPayload),
      dequeueCount: 5,
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
    Assert.IsTrue(receipt.IsMalformed);
    Assert.IsNull(receipt.Message);
    Assert.AreEqual(malformedPayload, receipt.RawPayload);
    Assert.AreEqual(5, receipt.DequeueCount);
  }

  /// <summary>
  /// Verifies syntactically valid payloads with invalid domain values retain provider receipt metadata.
  /// </summary>
  [TestMethod]
  public async Task ReceiveAnalysisAsync_SemanticallyInvalidPayload_ReturnsMalformedReceipt()
  {
    AnalysisQueueMessage message = CreateMessage();
    string validPayload = JsonSerializer.Serialize(message);
    string invalidPayload = validPayload.Replace(
      message.TargetId.ToString(),
      Guid.Empty.ToString(),
      StringComparison.OrdinalIgnoreCase);
    QueueMessage providerMessage = QueuesModelFactory.QueueMessage(
      "message-1",
      "receipt-1",
      BinaryData.FromString(invalidPayload),
      dequeueCount: 5,
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
    Assert.IsTrue(receipt.IsMalformed);
    Assert.AreEqual(invalidPayload, receipt.RawPayload);
  }

  /// <summary>
  /// Verifies renewal replaces the pop receipt and deletion uses the renewed value.
  /// </summary>
  [TestMethod]
  public async Task RenewThenDeleteAnalysisAsync_ValidReceipt_UsesLatestPopReceipt()
  {
    AnalysisQueueMessage message = CreateMessage();
    var receipt = new AnalysisQueueReceipt(
      message,
      "message-1",
      "receipt-1",
      dequeueCount: 1,
      nextVisibleAt: null);
    UpdateReceipt updateReceipt = QueuesModelFactory.UpdateReceipt(
      "receipt-2",
      DateTimeOffset.UtcNow.AddMinutes(2));
    var queueClient = new Mock<QueueClient>(MockBehavior.Strict);
    queueClient.Setup(client => client.UpdateMessageAsync(
        "message-1",
        "receipt-1",
        It.IsAny<string>(),
        TimeSpan.FromMinutes(2),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(Response.FromValue(updateReceipt, Mock.Of<Response>()));
    queueClient.Setup(client => client.DeleteMessageAsync(
        "message-1",
        "receipt-2",
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(Response.FromValue(Mock.Of<Response>(), Mock.Of<Response>()));
    var broker = new AzureStorageQueueBroker(queueClient.Object);

    await broker.RenewAnalysisVisibilityAsync(
      receipt,
      TimeSpan.FromMinutes(2),
      CancellationToken.None);
    await broker.DeleteAnalysisAsync(receipt, CancellationToken.None);

    Assert.AreEqual("receipt-2", receipt.PopReceipt);
    queueClient.VerifyAll();
  }

  private static AnalysisQueueMessage CreateMessage() =>
    AnalysisQueueMessage.CreateInvoice(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      "00-trace-span-01");
}
