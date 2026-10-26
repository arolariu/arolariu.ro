namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Analysis.Contracts;

using System;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies provider-neutral analysis queue message and receipt contracts.
/// </summary>
[TestClass]
public sealed class AnalysisQueueContractTests
{
  /// <summary>
  /// Verifies the invoice factory creates a valid invoice-only message.
  /// </summary>
  [TestMethod]
  public void CreateInvoiceMessage_ValidInput_ReturnsInvoiceMessage()
  {
    Guid targetId = Guid.NewGuid();
    Guid requestedBy = Guid.NewGuid();
    Guid correlationId = Guid.NewGuid();

    QueueAnalysisMessage message = QueueAnalysisMessage.CreateInvoiceMessage(
      targetId,
      requestedBy,
      correlationId,
      InvoiceAnalysisOptions.Fast(),
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");

    Assert.AreEqual(AnalysisTargetType.Invoice, message.TargetType);
    Assert.AreEqual(targetId, message.TargetId);
    Assert.AreEqual(requestedBy, message.RequestedBy);
    Assert.AreEqual(correlationId, message.CorrelationId);
    Assert.IsNotNull(message.InvoiceOptions);
    Assert.IsNull(message.MerchantOptions);
    Assert.IsNull(message.TargetPartitionIdentifier);
  }

  /// <summary>
  /// Verifies the merchant factory preserves the merchant partition identifier.
  /// </summary>
  [TestMethod]
  public void CreateMerchantMessage_ValidInput_ReturnsMerchantMessage()
  {
    Guid targetId = Guid.NewGuid();
    Guid requestedBy = Guid.NewGuid();
    Guid correlationId = Guid.NewGuid();
    Guid parentCompanyId = Guid.NewGuid();

    QueueAnalysisMessage message = QueueAnalysisMessage.CreateMerchantMessage(
      targetId,
      requestedBy,
      correlationId,
      parentCompanyId,
      MerchantAnalysisOptions.Fast(),
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");

    Assert.AreEqual(AnalysisTargetType.Merchant, message.TargetType);
    Assert.AreEqual(parentCompanyId, message.TargetPartitionIdentifier);
    Assert.IsNull(message.InvoiceOptions);
    Assert.IsNotNull(message.MerchantOptions);
  }

  /// <summary>
  /// Verifies replacement messages preserve their logical attempt number.
  /// </summary>
  [TestMethod]
  public void CreateInvoiceMessage_AttemptTwo_PreservesAttempt()
  {
    QueueAnalysisMessage message = QueueAnalysisMessage.CreateInvoiceMessage(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      attemptNumber: 2);

    Assert.AreEqual(2, message.AttemptNumber);
  }

  /// <summary>
  /// Verifies logical attempts outside the selective-retry policy are rejected.
  /// </summary>
  [TestMethod]
  [DataRow(0)]
  [DataRow(4)]
  public void CreateInvoiceMessage_AttemptOutsidePolicy_ThrowsArgumentOutOfRangeException(
    int attemptNumber)
  {
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
      QueueAnalysisMessage.CreateInvoiceMessage(
        Guid.NewGuid(),
        Guid.NewGuid(),
        Guid.NewGuid(),
        InvoiceAnalysisOptions.Fast(),
        "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
        attemptNumber));
  }

  /// <summary>
  /// Verifies empty identifiers are rejected before a message reaches the queue.
  /// </summary>
  [TestMethod]
  [DataRow("target")]
  [DataRow("requester")]
  [DataRow("correlation")]
  public void CreateInvoiceMessage_EmptyIdentifier_ThrowsArgumentException(string emptyIdentifier)
  {
    Guid targetId = emptyIdentifier == "target" ? Guid.Empty : Guid.NewGuid();
    Guid requestedBy = emptyIdentifier == "requester" ? Guid.Empty : Guid.NewGuid();
    Guid correlationId = emptyIdentifier == "correlation" ? Guid.Empty : Guid.NewGuid();

    Assert.ThrowsExactly<ArgumentException>(() => QueueAnalysisMessage.CreateInvoiceMessage(
      targetId,
      requestedBy,
      correlationId,
      InvoiceAnalysisOptions.Fast(),
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"));
  }

  /// <summary>Verifies malformed W3C trace context is rejected before enqueue.</summary>
  [TestMethod]
  public void CreateInvoiceMessage_InvalidTraceParent_ThrowsArgumentException()
  {
    Assert.ThrowsExactly<ArgumentException>(() => QueueAnalysisMessage.CreateInvoiceMessage(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      "invalid-trace-parent"));
  }

  /// <summary>
  /// Verifies queue receipts require the provider identifiers needed for renew and delete operations.
  /// </summary>
  [TestMethod]
  public void Constructor_BlankProviderIdentifier_ThrowsArgumentException()
  {
    QueueAnalysisMessage message = QueueAnalysisMessage.CreateInvoiceMessage(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");

    Assert.ThrowsExactly<ArgumentException>(() => new AnalysisQueueReceipt(
      message,
      messageId: " ",
      popReceipt: "receipt",
      dequeueCount: 1,
      nextVisibleAt: null));
  }

  /// <summary>
  /// Verifies JSON serialization preserves the queue transport contract.
  /// </summary>
  [TestMethod]
  public void SerializationRoundTrip_ValidMessage_PreservesContract()
  {
    QueueAnalysisMessage message = QueueAnalysisMessage.CreateMerchantMessage(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      MerchantAnalysisOptions.Comprehensive(),
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");

    string json = JsonSerializer.Serialize(message);
    QueueAnalysisMessage? deserializedMessage = JsonSerializer.Deserialize<QueueAnalysisMessage>(json);

    Assert.AreEqual(message, deserializedMessage);
  }

  /// <summary>
  /// Verifies serialization preserves the terminal logical attempt.
  /// </summary>
  [TestMethod]
  public void SerializationRoundTrip_AttemptThree_PreservesAttempt()
  {
    QueueAnalysisMessage message = QueueAnalysisMessage.CreateMerchantMessage(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      MerchantAnalysisOptions.Fast(),
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      attemptNumber: 3);

    string json = JsonSerializer.Serialize(message);
    QueueAnalysisMessage? deserializedMessage = JsonSerializer.Deserialize<QueueAnalysisMessage>(json);

    Assert.AreEqual(3, deserializedMessage?.AttemptNumber);
  }
}
