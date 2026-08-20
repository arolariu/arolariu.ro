namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies OCR persistence preserves existing product enrichment while refreshing extracted values.
/// </summary>
[TestClass]
public sealed class InvoiceProcessingReconciliationTests
{
  /// <summary>Verifies product-code matching preserves enrichment and refreshes OCR confidence.</summary>
  [TestMethod]
  public async Task ProcessAnalysisAsync_ProductCodeMatch_PreservesEnrichment()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
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
    Invoice invoice = CreateInvoice(invoiceId, userId, [previous]);
    InvoiceAnalysisExecutionResult execution = CreateExecution(
      invoiceId,
      userId,
      [new ExtractedProduct("Fresh milk", 2m, "pcs", "sku-1", 6m, 0.91)]);
    Invoice persisted = await PersistAsync(invoice, execution);
    Product product = persisted.Items.Single();

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
  public async Task ProcessAnalysisAsync_DuplicateAttributeMatches_UsesFifoAndLeavesUnmatchedClean()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
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
      Quantity = 1.00m,
      Price = 5.0m,
      Classification = secondClassification,
      Metadata = new ProductMetadata { IsComplete = true },
    };
    Invoice invoice = CreateInvoice(invoiceId, userId, [first, second]);
    InvoiceAnalysisExecutionResult execution = CreateExecution(
      invoiceId,
      userId,
      [
        new ExtractedProduct("MILK", 1m, "pcs", string.Empty, 5m, 0.8),
        new ExtractedProduct("milk", 1m, "pcs", string.Empty, 5m, 0.7),
        new ExtractedProduct("Bread", 1m, "pcs", string.Empty, 4m, 0.9),
      ]);
    Invoice persisted = await PersistAsync(invoice, execution);
    Product[] products = [.. persisted.Items];

    Assert.AreSame(firstClassification, products[0].Classification);
    Assert.IsTrue(products[0].Metadata.IsEdited);
    Assert.AreSame(secondClassification, products[1].Classification);
    Assert.IsTrue(products[1].Metadata.IsComplete);
    Assert.IsNull(products[2].Classification);
    Assert.IsFalse(products[2].Metadata.IsEdited);
    Assert.AreEqual(0.9, products[2].Metadata.Confidence);
  }

  private static async Task<Invoice> PersistAsync(
    Invoice invoice,
    InvoiceAnalysisExecutionResult execution)
  {
    var receipt = new AnalysisQueueReceipt(
      execution.Message,
      "message-1",
      "pop-receipt-1",
      dequeueCount: 1,
      nextVisibleAt: null);
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    invoiceOrchestration.Setup(service => service.ReadInvoiceObject(
        invoice.id,
        invoice.UserIdentifier,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    invoiceOrchestration.Setup(service => service.UpdateInvoiceObject(
        invoice,
        invoice.id,
        invoice.UserIdentifier,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    var analysisOrchestration = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysisOrchestration.Setup(service => service.ReceiveAnalysisAsync(
        TimeSpan.FromMinutes(2),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(receipt);
    analysisOrchestration.Setup(service => service.ExecuteInvoiceAnalysisAsync(
        execution.Message,
        invoice,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(execution);
    analysisOrchestration.Setup(service => service.DeleteAnalysisAsync(
        receipt,
        It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      Mock.Of<IMerchantOrchestrationService>(),
      analysisOrchestration.Object,
      NullLoggerFactory.Instance);

    bool processed = await service.ProcessAnalysisAsync(CancellationToken.None);
    Assert.IsTrue(processed);
    return invoice;
  }

  private static InvoiceAnalysisExecutionResult CreateExecution(
    Guid invoiceId,
    Guid userId,
    ExtractedProduct[] products)
  {
    InvoiceAnalysisOptions options = new(
      AnalysisProfile.Custom,
      documentExtraction: true,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0);
    QueueAnalysisMessage message = QueueAnalysisMessage.CreateInvoiceMessage(
      invoiceId,
      userId,
      Guid.NewGuid(),
      options,
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
    var extraction = new ReceiptExtractionResult(
      products,
      new PaymentInformation(),
      receiptType: string.Empty,
      countryRegion: string.Empty,
      taxDetails: [],
      payments: []);

    return new InvoiceAnalysisExecutionResult(
      message,
      new InvoiceAnalysisPatch(extraction, null, null, null, null, null),
      CompletedCapabilities: []);
  }

  private static Invoice CreateInvoice(Guid invoiceId, Guid userId, Product[] products) =>
    new()
    {
      id = invoiceId,
      UserIdentifier = userId,
      Items = products,
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
