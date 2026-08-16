namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Azure;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies deterministic multi-scan extraction behavior and exception classification for
/// <see cref="DocumentAnalysisFoundationService"/>.
/// </summary>
[TestClass]
public sealed class DocumentAnalysisFoundationServiceTests
{
  private static readonly string[] OrderedDeduplicatedProductNames =
  [
    "Milk",
    "Bread",
  ];

  /// <summary>
  /// Verifies that all scans are analyzed concurrently while merged products remain ordered by the caller's input sequence.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_MultipleScans_AnalyzesConcurrentlyMergesInInputOrderAndDeduplicatesProducts()
  {
    var broker = new ScriptedDocumentIntelligenceBroker(
      ScriptedDocumentIntelligenceBroker.Success(
        ReceiptDocumentTestData.Page("Milk", 1m),
        delay: TimeSpan.FromMilliseconds(120)),
      ScriptedDocumentIntelligenceBroker.Success(
        ReceiptDocumentTestData.Page("Milk", 1m, "Bread", 2m),
        delay: TimeSpan.FromMilliseconds(10)));

    var service = new DocumentAnalysisFoundationService(broker, NullLoggerFactory.Instance);

    var result = await service.ExtractInvoiceAsync(
      [InvoiceScanTestData.First(), InvoiceScanTestData.Second()],
      CancellationToken.None);

    CollectionAssert.AreEqual(
      OrderedDeduplicatedProductNames,
      result.Products.Select(product => product.Name).ToArray());

    Assert.IsTrue(
      broker.MaxConcurrentRequests >= 2,
      "The foundation service must fan out scan analysis concurrently.");
  }

  /// <summary>
  /// Verifies that the first non-empty merchant candidate wins and duplicate tax or payment rows are removed.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_MultipleScans_SelectsFirstNonEmptyMerchantAndDeduplicatesCharges()
  {
    var broker = new ScriptedDocumentIntelligenceBroker(
      ReceiptDocumentTestData.Document(
        merchantName: "First Merchant",
        taxDetails:
        [
          ReceiptDocumentTestData.Tax(1.90m, 19m, 10m, "VAT"),
        ],
        payments:
        [
          ReceiptDocumentTestData.Tender("card", 11.90m),
        ]),
      ReceiptDocumentTestData.Document(
        merchantName: "Second Merchant",
        merchantAddress: "Should Not Override",
        taxDetails:
        [
          ReceiptDocumentTestData.Tax(1.90m, 19m, 10m, "VAT"),
          ReceiptDocumentTestData.Tax(0.50m, 5m, 10m, "Local"),
        ],
        payments:
        [
          ReceiptDocumentTestData.Tender("card", 11.90m),
          ReceiptDocumentTestData.Tender("cash", 1.00m),
        ]));

    var service = new DocumentAnalysisFoundationService(broker, NullLoggerFactory.Instance);

    var result = await service.ExtractInvoiceAsync(
      [InvoiceScanTestData.First(), InvoiceScanTestData.Second()],
      CancellationToken.None);

    Assert.IsNotNull(result.MerchantCandidate);
    Assert.AreEqual("First Merchant", result.MerchantCandidate.Name);
    Assert.AreEqual(2, result.TaxDetails.Count);
    Assert.AreEqual(2, result.Payments.Count);
  }

  /// <summary>
  /// Verifies trimming, invalid-line rejection, and safe arithmetic derivation of missing quantity or price.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_LineItemsRequireNormalization_NormalizesDerivesAndRejectsInvalidProducts()
  {
    var broker = new ScriptedDocumentIntelligenceBroker(
      ReceiptDocumentTestData.Document(
        products:
        [
          ReceiptDocumentTestData.Product("  Apples  ", 0m, " kg ", " A-1 ", 2.00m, totalPrice: 6.00m),
          ReceiptDocumentTestData.Product("Bananas", 4m, " pcs ", "B-2", 0m, totalPrice: 10.00m),
          ReceiptDocumentTestData.Product("Invalid", -1m, "pcs", "BAD", 3.00m, totalPrice: 3.00m),
        ]));

    var service = new DocumentAnalysisFoundationService(broker, NullLoggerFactory.Instance);

    var result = await service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None);

    Assert.AreEqual(2, result.Products.Count);
    Assert.AreEqual("Apples", result.Products[0].Name);
    Assert.AreEqual("kg", result.Products[0].QuantityUnit);
    Assert.AreEqual("A-1", result.Products[0].ProductCode);
    Assert.AreEqual(3m, result.Products[0].Quantity);
    Assert.AreEqual(2.50m, result.Products[1].Price);
    Assert.IsFalse(result.Products.Any(product => product.Name == "Invalid"));
  }

  /// <summary>
  /// Verifies cancellation escapes unchanged when the Azure boundary honors the provided token.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WhenCancelled_PropagatesOperationCanceledException()
  {
    using var cts = new CancellationTokenSource(delay: TimeSpan.FromMilliseconds(20));

    var broker = new ScriptedDocumentIntelligenceBroker(
      ScriptedDocumentIntelligenceBroker.Success(
        ReceiptDocumentTestData.Page("Milk", 1m),
        delay: TimeSpan.FromMilliseconds(250)));

    var service = new DocumentAnalysisFoundationService(broker, NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<TaskCanceledException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], cts.Token));
  }

  /// <summary>
  /// Verifies dependency-validation faults from the Azure boundary are wrapped into the analysis foundation dependency-validation exception tier.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WhenBrokerThrowsRequestValidationFailure_ThrowsDependencyValidationException()
  {
    var broker = new ScriptedDocumentIntelligenceBroker(
      ScriptedDocumentIntelligenceBroker.Failure(new RequestFailedException(status: 400, message: "bad request")));

    var service = new DocumentAnalysisFoundationService(broker, NullLoggerFactory.Instance);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyValidationException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None));

    Assert.IsInstanceOfType<RequestFailedException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies transient dependency failures from the Azure boundary are wrapped into the analysis foundation dependency exception tier.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WhenBrokerThrowsTransientFailure_ThrowsDependencyException()
  {
    var broker = new ScriptedDocumentIntelligenceBroker(
      ScriptedDocumentIntelligenceBroker.Failure(new RequestFailedException(status: 429, message: "rate limited")));

    var service = new DocumentAnalysisFoundationService(broker, NullLoggerFactory.Instance);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None));

    Assert.IsInstanceOfType<RequestFailedException>(exception.InnerException);
  }
}
