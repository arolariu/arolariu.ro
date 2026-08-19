namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Analysis.Contracts;

using System;

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
  public void CreateInvoice_ValidInput_ReturnsInvoiceMessage()
  {
    Guid targetId = Guid.NewGuid();
    Guid requestedBy = Guid.NewGuid();
    Guid correlationId = Guid.NewGuid();

    AnalysisQueueMessage message = AnalysisQueueMessage.CreateInvoice(
      targetId,
      requestedBy,
      correlationId,
      InvoiceAnalysisOptions.Fast(),
      "00-trace-span-01");

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
  public void CreateMerchant_ValidInput_ReturnsMerchantMessage()
  {
    Guid targetId = Guid.NewGuid();
    Guid requestedBy = Guid.NewGuid();
    Guid correlationId = Guid.NewGuid();
    Guid parentCompanyId = Guid.NewGuid();

    AnalysisQueueMessage message = AnalysisQueueMessage.CreateMerchant(
      targetId,
      requestedBy,
      correlationId,
      parentCompanyId,
      MerchantAnalysisOptions.Fast(),
      "00-trace-span-01");

    Assert.AreEqual(AnalysisTargetType.Merchant, message.TargetType);
    Assert.AreEqual(parentCompanyId, message.TargetPartitionIdentifier);
    Assert.IsNull(message.InvoiceOptions);
    Assert.IsNotNull(message.MerchantOptions);
  }

  /// <summary>
  /// Verifies empty identifiers are rejected before a message reaches the queue.
  /// </summary>
  [TestMethod]
  [DataRow("target")]
  [DataRow("requester")]
  [DataRow("correlation")]
  public void CreateInvoice_EmptyIdentifier_ThrowsArgumentException(string emptyIdentifier)
  {
    Guid targetId = emptyIdentifier == "target" ? Guid.Empty : Guid.NewGuid();
    Guid requestedBy = emptyIdentifier == "requester" ? Guid.Empty : Guid.NewGuid();
    Guid correlationId = emptyIdentifier == "correlation" ? Guid.Empty : Guid.NewGuid();

    Assert.ThrowsExactly<ArgumentException>(() => AnalysisQueueMessage.CreateInvoice(
      targetId,
      requestedBy,
      correlationId,
      InvoiceAnalysisOptions.Fast(),
      "00-trace-span-01"));
  }

  /// <summary>
  /// Verifies queue receipts require the provider identifiers needed for renew and delete operations.
  /// </summary>
  [TestMethod]
  public void Constructor_BlankProviderIdentifier_ThrowsArgumentException()
  {
    AnalysisQueueMessage message = AnalysisQueueMessage.CreateInvoice(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      "00-trace-span-01");

    Assert.ThrowsExactly<ArgumentException>(() => new AnalysisQueueReceipt(
      message,
      messageId: " ",
      popReceipt: "receipt",
      dequeueCount: 1,
      nextVisibleAt: null));
  }
}
