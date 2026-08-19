namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies document-analysis payment-method normalization and payment-line merging behavior.
/// </summary>
[TestClass]
public sealed class DocumentAnalysisPaymentTypeTests
{
  /// <summary>
  /// Verifies that every supported payment-method alias maps to the expected normalized payment type.
  /// </summary>
  /// <param name="method">The provider method value.</param>
  /// <param name="expectedPaymentType">The expected normalized payment type.</param>
  [TestMethod]
  [DataRow("card", PaymentType.CARD)]
  [DataRow("CARD", PaymentType.CARD)]
  [DataRow("Credit Card", PaymentType.CARD)]
  [DataRow("debit card", PaymentType.CARD)]
  [DataRow(" cash ", PaymentType.CASH)]
  [DataRow("transfer", PaymentType.TRANSFER)]
  [DataRow("BANK TRANSFER", PaymentType.TRANSFER)]
  [DataRow("mobile", PaymentType.MOBILEPAYMENT)]
  [DataRow("mobile payment", PaymentType.MOBILEPAYMENT)]
  [DataRow("Apple Pay", PaymentType.MOBILEPAYMENT)]
  [DataRow("google pay", PaymentType.MOBILEPAYMENT)]
  [DataRow("voucher", PaymentType.VOUCHER)]
  [DataRow("Coupon", PaymentType.VOUCHER)]
  [DataRow("crypto", PaymentType.UNKNOWN)]
  public async Task ExtractInvoiceAsync_PaymentMethodAlias_DeterminesExpectedPaymentType(
    string method,
    PaymentType expectedPaymentType)
  {
    var broker = new ScriptedDocumentIntelligenceBroker(
      ReceiptDocumentTestData.Document(
        payments:
        [
          ReceiptDocumentTestData.Tender(method, 15.50m),
        ]));

    var service = new DocumentAnalysisFoundationService(
      broker,
      NullLoggerFactory.Instance);

    var result = await service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None);

    Assert.AreEqual(expectedPaymentType, result.PaymentInformation.PaymentType);
  }

  /// <summary>
  /// Verifies that missing payment lines leave the normalized payment type unknown.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WithoutPaymentLines_DeterminesUnknownPaymentType()
  {
    var broker = new ScriptedDocumentIntelligenceBroker(ReceiptDocumentTestData.Document());
    var service = new DocumentAnalysisFoundationService(
      broker,
      NullLoggerFactory.Instance);

    var result = await service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None);

    Assert.AreEqual(PaymentType.UNKNOWN, result.PaymentInformation.PaymentType);
  }

  /// <summary>
  /// Verifies that empty payment rows are ignored before payment type inference.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_EmptyPaymentRow_IgnoresRowAndKeepsPaymentTypeUnknown()
  {
    var broker = new ScriptedDocumentIntelligenceBroker(
      ReceiptDocumentTestData.Document(
        payments:
        [
          ReceiptDocumentTestData.Tender(" ", 0.0m),
        ]));

    var service = new DocumentAnalysisFoundationService(
      broker,
      NullLoggerFactory.Instance);

    var result = await service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None);

    Assert.AreEqual(0, result.Payments.Count);
    Assert.AreEqual(PaymentType.UNKNOWN, result.PaymentInformation.PaymentType);
  }
}
