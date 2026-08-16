namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies Azure Document Intelligence field mapping into provider-neutral receipt contracts.
/// </summary>
[TestClass]
public sealed class DocumentMappingTests
{
  /// <summary>
  /// Verifies that Azure receipt fields are mapped into provider-neutral records without touching domain aggregates.
  /// </summary>
  [TestMethod]
  public void MapReceiptDocument_ValidAnalyzedDocument_MapsValuesAndConfidence()
  {
    var analyzedDocument = ReceiptDocumentTestData.AzureAnalyzedDocument();

    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(analyzedDocument);

    Assert.AreEqual("Contoso Market", receiptDocument.Merchant.Name.Value);
    Assert.AreEqual("RO", receiptDocument.CountryRegion.Value);
    Assert.AreEqual("itemized", receiptDocument.ReceiptType.Value);
    Assert.AreEqual(1, receiptDocument.Products.Count);
    Assert.AreEqual("Milk", receiptDocument.Products[0].Name.Value);
    Assert.AreEqual(2m, receiptDocument.Products[0].Quantity.Value);
    Assert.AreEqual("SKU-1", receiptDocument.Products[0].ProductCode.Value);
    Assert.AreEqual(0.81, receiptDocument.Products[0].Confidence, 0.0001);
    Assert.AreEqual(15.50m, receiptDocument.Payment.TotalAmount.Value);
    Assert.AreEqual(1, receiptDocument.TaxDetails.Count);
    Assert.AreEqual(1, receiptDocument.Payments.Count);
  }

  /// <summary>
  /// Verifies source-scan stamping propagates to all nested provider-neutral fields.
  /// </summary>
  [TestMethod]
  public void WithSourceScanIndex_StampedDocument_PropagatesIndexToNestedFields()
  {
    var analyzedDocument = ReceiptDocumentTestData.AzureAnalyzedDocument();
    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(analyzedDocument);

    ReceiptDocument stampedDocument = receiptDocument.WithSourceScanIndex(2);

    Assert.AreEqual(2, stampedDocument.Merchant.Name.SourceScanIndex);
    Assert.AreEqual(2, stampedDocument.Products[0].Name.SourceScanIndex);
    Assert.AreEqual(2, stampedDocument.Payment.TotalAmount.SourceScanIndex);
    Assert.AreEqual(2, stampedDocument.TaxDetails[0].Amount.SourceScanIndex);
    Assert.AreEqual(2, stampedDocument.Payments[0].Method.SourceScanIndex);
  }

  /// <summary>
  /// Verifies unsupported root field types do not leak arbitrary OCR content into string output fields.
  /// </summary>
  [TestMethod]
  public void MapReceiptDocument_WhenRootStringFieldsUseUnsupportedTypes_IgnoresArbitraryContent()
  {
    var analyzedDocument = ReceiptDocumentTestData.AzureAnalyzedDocumentWithUnsupportedRootStringTypes();

    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(analyzedDocument);

    Assert.AreEqual(string.Empty, receiptDocument.Merchant.Name.Value);
    Assert.AreEqual(string.Empty, receiptDocument.Merchant.Address.Value);
    Assert.AreEqual(string.Empty, receiptDocument.Merchant.PhoneNumber.Value);
    Assert.AreEqual(string.Empty, receiptDocument.ReceiptType.Value);
    Assert.AreEqual(string.Empty, receiptDocument.CountryRegion.Value);
  }

  /// <summary>
  /// Verifies unsupported nested field types do not leak arbitrary OCR content into product, tax, or payment strings.
  /// </summary>
  [TestMethod]
  public void MapReceiptDocument_WhenNestedStringFieldsUseUnsupportedTypes_IgnoresArbitraryContent()
  {
    var analyzedDocument = ReceiptDocumentTestData.AzureAnalyzedDocumentWithUnsupportedNestedStringTypes();

    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(analyzedDocument);

    Assert.AreEqual(1, receiptDocument.Products.Count);
    Assert.AreEqual(string.Empty, receiptDocument.Products[0].Name.Value);
    Assert.AreEqual(string.Empty, receiptDocument.Products[0].QuantityUnit.Value);
    Assert.AreEqual(string.Empty, receiptDocument.Products[0].ProductCode.Value);
    Assert.AreEqual(1, receiptDocument.TaxDetails.Count);
    Assert.AreEqual(string.Empty, receiptDocument.TaxDetails[0].Description.Value);
    Assert.AreEqual(1, receiptDocument.Payments.Count);
    Assert.AreEqual(string.Empty, receiptDocument.Payments[0].Method.Value);
  }
}
