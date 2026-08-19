namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies document-analysis product normalization, rejection, derivation, and confidence behavior.
/// </summary>
[TestClass]
public sealed class DocumentAnalysisProductMappingTests
{
  /// <summary>
  /// Verifies that product rows without a usable name are rejected.
  /// </summary>
  /// <param name="name">The provider product name value.</param>
  [TestMethod]
  [DataRow(null)]
  [DataRow("")]
  [DataRow("   ")]
  public async Task ExtractInvoiceAsync_ProductWithoutName_RejectsProduct(string? name)
  {
    ReceiptProductDocument product = Product(name, quantity: 1.0m, price: 2.0m, totalPrice: 2.0m);
    var broker = new ScriptedDocumentIntelligenceBroker(ReceiptDocumentTestData.Document(products: [product]));
    var service = new DocumentAnalysisFoundationService(
      broker,
      NullLoggerFactory.Instance);

    var result = await service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None);

    Assert.AreEqual(0, result.Products.Count);
  }

  /// <summary>
  /// Verifies that product rows with negative numeric components are rejected.
  /// </summary>
  /// <param name="quantity">The provider quantity value.</param>
  /// <param name="price">The provider price value.</param>
  /// <param name="totalPrice">The provider total-price value.</param>
  [TestMethod]
  [DataRow("-1.0", "2.0", "2.0")]
  [DataRow("1.0", "-2.0", "2.0")]
  [DataRow("1.0", "2.0", "-2.0")]
  public async Task ExtractInvoiceAsync_ProductWithNegativeComponent_RejectsProduct(
    string quantity,
    string price,
    string totalPrice)
  {
    ReceiptProductDocument product = Product(
      "Invalid",
      decimal.Parse(quantity, System.Globalization.CultureInfo.InvariantCulture),
      decimal.Parse(price, System.Globalization.CultureInfo.InvariantCulture),
      decimal.Parse(totalPrice, System.Globalization.CultureInfo.InvariantCulture));

    var broker = new ScriptedDocumentIntelligenceBroker(ReceiptDocumentTestData.Document(products: [product]));
    var service = new DocumentAnalysisFoundationService(
      broker,
      NullLoggerFactory.Instance);

    var result = await service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None);

    Assert.AreEqual(0, result.Products.Count);
  }

  /// <summary>
  /// Verifies that missing quantity is derived from positive total and unit price.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_ProductMissingQuantity_DerivesPositiveQuantity()
  {
    ReceiptProductDocument product = Product("Apples", quantity: 0.0m, price: 2.0m, totalPrice: 6.0m);
    var broker = new ScriptedDocumentIntelligenceBroker(ReceiptDocumentTestData.Document(products: [product]));
    var service = new DocumentAnalysisFoundationService(
      broker,
      NullLoggerFactory.Instance);

    var result = await service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None);

    Assert.AreEqual(1, result.Products.Count);
    Assert.AreEqual(3.0m, result.Products[0].Quantity);
  }

  /// <summary>
  /// Verifies that missing price is derived from positive total and quantity.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_ProductMissingPrice_DerivesPositivePrice()
  {
    ReceiptProductDocument product = Product("Bananas", quantity: 4.0m, price: 0.0m, totalPrice: 10.0m);
    var broker = new ScriptedDocumentIntelligenceBroker(ReceiptDocumentTestData.Document(products: [product]));
    var service = new DocumentAnalysisFoundationService(
      broker,
      NullLoggerFactory.Instance);

    var result = await service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None);

    Assert.AreEqual(1, result.Products.Count);
    Assert.AreEqual(2.5m, result.Products[0].Price);
  }

  /// <summary>
  /// Verifies a product without either derivation component retains its extracted zero values rather than inventing
  /// quantity or price from a total alone.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_ProductWithoutQuantityOrPrice_DoesNotDeriveEitherComponent()
  {
    ReceiptProductDocument product = Product("Unresolved", quantity: 0.0m, price: 0.0m, totalPrice: 10.0m);
    var broker = new ScriptedDocumentIntelligenceBroker(ReceiptDocumentTestData.Document(products: [product]));
    var service = new DocumentAnalysisFoundationService(
      broker,
      NullLoggerFactory.Instance);

    var result = await service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None);

    Assert.AreEqual(1, result.Products.Count);
    Assert.AreEqual(0.0m, result.Products[0].Quantity);
    Assert.AreEqual(0.0m, result.Products[0].Price);
  }

  /// <summary>
  /// Verifies that fallback product confidence is the maximum confidence across product fields.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_ProductWithoutLineConfidence_UsesMaximumFieldConfidence()
  {
    ReceiptProductDocument product = Product("Milk", quantity: 1.0m, price: 3.0m, totalPrice: null, confidence: 0.0);
    var broker = new ScriptedDocumentIntelligenceBroker(ReceiptDocumentTestData.Document(products: [product]));
    var service = new DocumentAnalysisFoundationService(
      broker,
      NullLoggerFactory.Instance);

    var result = await service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None);

    Assert.AreEqual(1, result.Products.Count);
    Assert.AreEqual(0.98, result.Products[0].Confidence);
  }

  /// <summary>
  /// Verifies that tax and payment rows with content are normalized and deduplicated while empty rows are ignored.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_DuplicateCharges_DeduplicatesAndIgnoresEmptyRows()
  {
    var broker = new ScriptedDocumentIntelligenceBroker(
      ReceiptDocumentTestData.Document(
        taxDetails:
        [
          ReceiptDocumentTestData.Tax(0.0m, 0.0m, 0.0m, " "),
          ReceiptDocumentTestData.Tax(1.9m, 19.0m, 10.0m, " VAT "),
          ReceiptDocumentTestData.Tax(1.9m, 19.0m, 10.0m, "VAT"),
        ],
        payments:
        [
          ReceiptDocumentTestData.Tender(" ", 0.0m),
          ReceiptDocumentTestData.Tender(" Card ", 11.9m),
          ReceiptDocumentTestData.Tender("Card", 11.9m),
        ]));

    var service = new DocumentAnalysisFoundationService(
      broker,
      NullLoggerFactory.Instance);

    var result = await service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None);

    Assert.AreEqual(1, result.TaxDetails.Count);
    Assert.AreEqual("VAT", result.TaxDetails[0].Description);
    Assert.AreEqual(1, result.Payments.Count);
    Assert.AreEqual("Card", result.Payments[0].Method);
  }

  private static ReceiptProductDocument Product(
    string? name,
    decimal? quantity,
    decimal? price,
    decimal? totalPrice,
    double confidence = 0.91) =>
    new(
      Name: new DocumentValue<string>(name, 0.98, sourceScanIndex: -1),
      Quantity: new DocumentValue<decimal?>(quantity, 0.97, sourceScanIndex: -1),
      QuantityUnit: new DocumentValue<string>(" pcs ", 0.96, sourceScanIndex: -1),
      ProductCode: new DocumentValue<string>(" SKU-1 ", 0.95, sourceScanIndex: -1),
      Price: new DocumentValue<decimal?>(price, 0.94, sourceScanIndex: -1),
      TotalPrice: new DocumentValue<decimal?>(totalPrice, 0.93, sourceScanIndex: -1),
      Confidence: confidence);
}
