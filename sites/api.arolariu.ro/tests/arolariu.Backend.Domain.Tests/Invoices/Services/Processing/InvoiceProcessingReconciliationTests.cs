namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies OCR reconciliation preserves existing product enrichment while refreshing extracted values.
/// </summary>
[TestClass]
public sealed class InvoiceProcessingReconciliationTests
{
  /// <summary>Verifies product-code matching preserves enrichment and refreshes OCR confidence.</summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_ProductCodeMatch_PreservesEnrichment()
  {
    StandardClassification classification = CreateClassification("10000001", "Milk");
    AllergenAssessment allergenAssessment = AllergenAssessment.NoSignals(Guid.NewGuid());
    var previous = new Product
    {
      Name = "Old milk",
      ProductCode = "SKU-1",
      Quantity = 1m,
      Price = 5m,
      Classification = classification,
      AllergenAssessment = allergenAssessment,
      Metadata = new ProductMetadata
      {
        IsEdited = true,
        IsComplete = true,
        IsSoftDeleted = true,
        Confidence = 0.25,
      },
    };
    Invoice invoice = CreateInvoice([previous]);
    ReceiptExtraction extraction = CreateExtraction(
      [CreateProduct("Fresh milk", 2m, "pcs", "sku-1", 6m, 0.91)]);
    AnalysisOrchestrationService service = CreateService(extraction);

    (Invoice analyzed, InvoiceAnalysisOptions? failed) = await service.AnalyzeInvoiceAsync(
      invoice,
      ExtractionOnlyOptions(),
      Guid.NewGuid(),
      CancellationToken.None);
    Product product = analyzed.Items.Single();

    Assert.IsNull(failed);
    Assert.AreEqual("Fresh milk", product.Name);
    Assert.AreSame(classification, product.Classification);
    Assert.AreSame(allergenAssessment, product.AllergenAssessment);
    Assert.IsTrue(product.Metadata.IsEdited);
    Assert.IsTrue(product.Metadata.IsComplete);
    Assert.IsTrue(product.Metadata.IsSoftDeleted);
    Assert.AreEqual(0.91, product.Metadata.Confidence);
  }

  /// <summary>Verifies duplicate attribute matches consume previous items once and leave unmatched items clean.</summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_DuplicateAttributeMatches_UsesFifoAndLeavesUnmatchedClean()
  {
    StandardClassification firstClassification = CreateClassification("10000001", "First");
    StandardClassification secondClassification = CreateClassification("10000002", "Second");
    var first = new Product
    {
      Name = "  Milk ",
      Quantity = 1m,
      Price = 5m,
      Classification = firstClassification,
      Metadata = new ProductMetadata { IsEdited = true },
    };
    var second = new Product
    {
      Name = "milk",
      Quantity = 1m,
      Price = 5m,
      Classification = secondClassification,
      Metadata = new ProductMetadata { IsComplete = true },
    };
    Invoice invoice = CreateInvoice([first, second]);
    ReceiptExtraction extraction = CreateExtraction(
      [
        CreateProduct("MILK", 1m, "pcs", string.Empty, 5m, 0.8),
        CreateProduct("milk", 1m, "pcs", string.Empty, 5m, 0.7),
        CreateProduct("Bread", 1m, "pcs", string.Empty, 4m, 0.9),
      ]);
    AnalysisOrchestrationService service = CreateService(extraction);

    (Invoice analyzed, InvoiceAnalysisOptions? failed) = await service.AnalyzeInvoiceAsync(
      invoice,
      ExtractionOnlyOptions(),
      Guid.NewGuid(),
      CancellationToken.None);
    Product[] products = [.. analyzed.Items];

    Assert.IsNull(failed);
    Assert.AreSame(firstClassification, products[0].Classification);
    Assert.IsTrue(products[0].Metadata.IsEdited);
    Assert.AreSame(secondClassification, products[1].Classification);
    Assert.IsTrue(products[1].Metadata.IsComplete);
    Assert.IsNull(products[2].Classification);
    Assert.IsFalse(products[2].Metadata.IsEdited);
    Assert.AreEqual(0.9, products[2].Metadata.Confidence);
  }

  private static AnalysisOrchestrationService CreateService(ReceiptExtraction extraction)
  {
    var foundation = new Mock<IAnalysisFoundationService>(MockBehavior.Strict);
    foundation.Setup(service => service.ExtractInvoiceAsync(
        It.IsAny<System.Collections.Generic.IReadOnlyList<InvoiceScan>>(),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(extraction);

    return new AnalysisOrchestrationService(
      foundation.Object,
      Mock.Of<IAnalysisQueueFoundationService>(),
      NullLoggerFactory.Instance);
  }

  private static InvoiceAnalysisOptions ExtractionOnlyOptions() =>
    new(
      AnalysisProfile.Custom,
      documentExtraction: true,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0);

  private static ReceiptExtraction CreateExtraction(Product[] products) =>
    new(
      products,
      new PaymentInformation(),
      receiptType: string.Empty,
      countryRegion: string.Empty,
      taxDetails: [],
      payments: []);

  private static Product CreateProduct(
    string name,
    decimal quantity,
    string quantityUnit,
    string productCode,
    decimal price,
    double confidence) =>
    new()
    {
      Name = name,
      Quantity = quantity,
      QuantityUnit = quantityUnit,
      ProductCode = productCode,
      Price = price,
      Metadata = new ProductMetadata { Confidence = confidence },
    };

  private static Invoice CreateInvoice(Product[] products) =>
    new()
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid(),
      Items = products,
      Scans = [new InvoiceScan(ScanType.JPG, new Uri("https://example.test/receipt.jpg"), null)],
    };

  private static StandardClassification CreateClassification(string code, string label) =>
    new(
      ClassificationSystem.Gs1Gpc,
      "test-version",
      code,
      label,
      [new ClassificationNode("leaf", code, label)],
      ClassificationOrigin.Manual,
      confidence: null,
      evidence: []);
}
