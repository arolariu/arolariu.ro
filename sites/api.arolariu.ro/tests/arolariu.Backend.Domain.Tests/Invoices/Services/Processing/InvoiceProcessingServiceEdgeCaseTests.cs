namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Extensions.Logging;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Edge case unit tests for <see cref="InvoiceProcessingService"/> covering
/// product management, scan management, metadata management, and merchant operations.
/// </summary>
[TestClass]
public sealed class InvoiceProcessingServiceEdgeCaseTests
{
  private readonly Mock<IInvoiceOrchestrationService> mockInvoiceOrchestrationService;
  private readonly Mock<IMerchantOrchestrationService> mockMerchantOrchestrationService;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IInvoiceProcessingService>> mockLogger;
  private readonly InvoiceProcessingService service;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies.
  /// </summary>
  public InvoiceProcessingServiceEdgeCaseTests()
  {
    mockInvoiceOrchestrationService = new Mock<IInvoiceOrchestrationService>();
    mockMerchantOrchestrationService = new Mock<IMerchantOrchestrationService>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IInvoiceProcessingService>>();

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
        .Returns(mockLogger.Object);

    service = new InvoiceProcessingService(
        mockInvoiceOrchestrationService.Object,
        mockMerchantOrchestrationService.Object,
        mockLoggerFactory.Object);
  }

  #region Product Management Edge Cases

  /// <summary>
  /// Validates adding a product to an invoice.
  /// </summary>
  [TestMethod]
  public async Task AddProduct_ValidProduct_AddsSuccessfully()
  {
    // Arrange
    var product = new Product { Name = "Test Product" };
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);
    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await service.AddProduct(product, invoiceId, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(
      s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Validates adding a product with null user identifier.
  /// </summary>
  [TestMethod]
  public async Task AddProduct_NullUserIdentifier_AddsSuccessfully()
  {
    // Arrange
    var product = new Product { Name = "Test Product" };
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);
    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await service.AddProduct(product, invoiceId, null, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(
      s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, null, It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Verifies that sequential manual edits select the first and second indistinguishable products repeatedly.
  /// </summary>
  [TestMethod]
  public async Task UpdateProduct_SequentialDuplicateEdits_UpdatesFirstAndSecondRepeatedly()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var first = new Product { Name = "Instant Coffee", Quantity = 1m, Price = 10m };
    var second = new Product { Name = "Instant Coffee", Quantity = 1m, Price = 10m };
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Items = [first, second];

    mockInvoiceOrchestrationService
      .Setup(service => service.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    mockInvoiceOrchestrationService
      .Setup(service => service.UpdateInvoiceObject(invoice, invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    var originalSnapshot = new ProductUpdateSelector(
      OriginalProductCode: null,
      OriginalName: "  instant   coffee ",
      OriginalQuantity: 1m,
      OriginalUnitPrice: 10m,
      OriginalTotalPrice: 10m,
      OccurrenceOrdinal: 0);

    // Act
    await service.UpdateProduct(
      originalSnapshot,
      new Product { Name = "Instant Coffee", ProductCode = "first-edited", Quantity = 1m, Price = 10m },
      invoiceId,
      null,
      CancellationToken.None);
    await service.UpdateProduct(
      originalSnapshot with { OccurrenceOrdinal = 1 },
      new Product { Name = "Instant Coffee", ProductCode = "second-edited", Quantity = 1m, Price = 10m },
      invoiceId,
      null,
      CancellationToken.None);
    await service.UpdateProduct(
      originalSnapshot with { OccurrenceOrdinal = 1 },
      new Product { Name = "Instant Coffee", ProductCode = "second-edited-again", Quantity = 1m, Price = 10m },
      invoiceId,
      null,
      CancellationToken.None);

    // Assert
    Assert.AreEqual("first-edited", first.ProductCode);
    Assert.AreEqual("second-edited-again", second.ProductCode);
    mockInvoiceOrchestrationService.Verify(
      service => service.UpdateInvoiceObject(invoice, invoiceId, null, It.IsAny<CancellationToken>()),
      Times.Exactly(3));
  }

  /// <summary>
  /// Verifies that a nonblank original product code takes precedence over the composite snapshot.
  /// </summary>
  [TestMethod]
  public async Task UpdateProduct_OriginalProductCodeProvided_PrefersCodeMatch()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var nonMatchingCodeProduct = new Product
    {
      Name = "Coffee",
      ProductCode = "other-code",
      Quantity = 1m,
      Price = 10m,
    };
    var codeMatchedProduct = new Product
    {
      Name = "Different Coffee",
      ProductCode = "target-code",
      Quantity = 9m,
      Price = 99m,
    };
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Items = [nonMatchingCodeProduct, codeMatchedProduct];

    mockInvoiceOrchestrationService
      .Setup(service => service.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    mockInvoiceOrchestrationService
      .Setup(service => service.UpdateInvoiceObject(invoice, invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    var selector = new ProductUpdateSelector(
      OriginalProductCode: " target-code ",
      OriginalName: null,
      OriginalQuantity: null,
      OriginalUnitPrice: null,
      OriginalTotalPrice: null,
      OccurrenceOrdinal: null);

    // Act
    Product updated = await service.UpdateProduct(
      selector,
      new Product { Name = "Selected by code", Quantity = 2m, Price = 5m },
      invoiceId,
      null,
      CancellationToken.None);

    // Assert
    Assert.AreSame(codeMatchedProduct, updated);
    Assert.AreEqual("Coffee", nonMatchingCodeProduct.Name);
    Assert.AreEqual("Selected by code", codeMatchedProduct.Name);
  }

  /// <summary>
  /// Verifies that an occurrence ordinal beyond the matching set fails without an aggregate write.
  /// </summary>
  [TestMethod]
  public async Task UpdateProduct_OccurrenceOrdinalOutOfRange_ThrowsTypedErrorWithoutWriting()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Items =
    [
      new Product { Name = "Coffee", Quantity = 1m, Price = 10m },
      new Product { Name = "Coffee", Quantity = 1m, Price = 10m },
    ];

    mockInvoiceOrchestrationService
      .Setup(service => service.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    var selector = new ProductUpdateSelector(
      OriginalProductCode: null,
      OriginalName: "Coffee",
      OriginalQuantity: 1m,
      OriginalUnitPrice: 10m,
      OriginalTotalPrice: 10m,
      OccurrenceOrdinal: 2);

    // Act + Assert
    InvoiceProcessingServiceValidationException exception =
      await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceValidationException>(() =>
        service.UpdateProduct(
          selector,
          new Product { Name = "Replacement", Quantity = 1m, Price = 10m },
          invoiceId,
          null,
          CancellationToken.None));

    Assert.IsInstanceOfType<ProductUpdateSelectorOccurrenceOutOfRangeException>(exception.InnerException);
    mockInvoiceOrchestrationService.Verify(
      service => service.UpdateInvoiceObject(
        It.IsAny<Invoice>(),
        It.IsAny<Guid>(),
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()),
      Times.Never);
  }

  /// <summary>
  /// Verifies that indistinguishable composite matches require an explicit occurrence ordinal.
  /// </summary>
  [TestMethod]
  public async Task UpdateProduct_IndistinguishableCompositeWithoutOrdinal_ThrowsTypedAmbiguousErrorWithoutWriting()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Items =
    [
      new Product { Name = "Coffee", Quantity = 1m, Price = 10m },
      new Product { Name = "Coffee", Quantity = 1m, Price = 10m },
    ];

    mockInvoiceOrchestrationService
      .Setup(service => service.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    var selector = new ProductUpdateSelector(
      OriginalProductCode: null,
      OriginalName: "Coffee",
      OriginalQuantity: 1m,
      OriginalUnitPrice: 10m,
      OriginalTotalPrice: 10m,
      OccurrenceOrdinal: null);

    // Act + Assert
    InvoiceProcessingServiceValidationException exception =
      await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceValidationException>(() =>
        service.UpdateProduct(
          selector,
          new Product { Name = "Replacement", Quantity = 1m, Price = 10m },
          invoiceId,
          null,
          CancellationToken.None));

    Assert.IsInstanceOfType<ProductUpdateSelectorAmbiguousException>(exception.InnerException);
    mockInvoiceOrchestrationService.Verify(
      service => service.UpdateInvoiceObject(
        It.IsAny<Invoice>(),
        It.IsAny<Guid>(),
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()),
      Times.Never);
  }

  /// <summary>
  /// Verifies that no item is selected when the immutable composite snapshot does not match.
  /// </summary>
  [TestMethod]
  public async Task UpdateProduct_CompositeSnapshotMismatch_ThrowsTypedNotFoundWithoutWriting()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Items = [new Product { Name = "Coffee", Quantity = 1m, Price = 10m }];

    mockInvoiceOrchestrationService
      .Setup(service => service.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    var selector = new ProductUpdateSelector(
      OriginalProductCode: null,
      OriginalName: "Coffee",
      OriginalQuantity: 1m,
      OriginalUnitPrice: 9m,
      OriginalTotalPrice: 9m,
      OccurrenceOrdinal: null);

    // Act + Assert
    InvoiceProcessingServiceException exception =
      await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceException>(() =>
        service.UpdateProduct(
          selector,
          new Product { Name = "Replacement", Quantity = 1m, Price = 10m },
          invoiceId,
          null,
          CancellationToken.None));

    Assert.IsInstanceOfType<ProductNotFoundException>(exception.InnerException);
    mockInvoiceOrchestrationService.Verify(
      service => service.UpdateInvoiceObject(
        It.IsAny<Invoice>(),
        It.IsAny<Guid>(),
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()),
      Times.Never);
  }

  /// <summary>
  /// Verifies that a selected item retains server-owned state and writes the aggregate once.
  /// </summary>
  [TestMethod]
  public async Task UpdateProduct_CodeSelection_PreservesServerStateAndWritesOnce()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var classification = new StandardClassification(
      ClassificationSystem.Gs1Gpc,
      "analysis-v1",
      "10000025",
      "Original classification",
      [new ClassificationNode("brick", "10000025", "Original classification")],
      ClassificationOrigin.Analysis,
      confidence: 0.94,
      evidence: [new ClassificationEvidence("analysis.product", "Whole Milk")]);
    var persistedProduct = new Product
    {
      Name = "Whole Milk",
      ProductCode = "persisted-code",
      Quantity = 1m,
      Price = 8m,
      Classification = classification,
      AllergenAssessment = AllergenAssessment.NoSignals(Guid.NewGuid()),
      Metadata = new ProductMetadata
      {
        IsComplete = true,
        IsSoftDeleted = true,
        Confidence = 0.91,
      },
    };
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Items = [persistedProduct];

    mockInvoiceOrchestrationService
      .Setup(service => service.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    mockInvoiceOrchestrationService
      .Setup(service => service.UpdateInvoiceObject(invoice, invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    var selector = new ProductUpdateSelector(
      OriginalProductCode: "persisted-code",
      OriginalName: null,
      OriginalQuantity: null,
      OriginalUnitPrice: null,
      OriginalTotalPrice: null,
      OccurrenceOrdinal: null);

    // Act
    Product updated = await service.UpdateProduct(
      selector,
      new Product
      {
        Name = "Organic Whole Milk",
        ProductCode = "replacement-code",
        Quantity = 3m,
        QuantityUnit = "L",
        Price = 11m,
      },
      invoiceId,
      null,
      CancellationToken.None);

    // Assert
    Assert.AreSame(persistedProduct, updated);
    Assert.AreEqual("Organic Whole Milk", persistedProduct.Name);
    Assert.AreEqual("replacement-code", persistedProduct.ProductCode);
    Assert.AreEqual(3m, persistedProduct.Quantity);
    Assert.AreEqual("L", persistedProduct.QuantityUnit);
    Assert.AreEqual(11m, persistedProduct.Price);
    Assert.AreSame(classification, persistedProduct.Classification);
    Assert.AreEqual(AllergenAssessmentStatus.NoSignals, persistedProduct.AllergenAssessment!.Status);
    Assert.IsTrue(persistedProduct.Metadata.IsEdited);
    Assert.IsTrue(persistedProduct.Metadata.IsComplete);
    Assert.IsTrue(persistedProduct.Metadata.IsSoftDeleted);
    Assert.AreEqual(0.91, persistedProduct.Metadata.Confidence);
    mockInvoiceOrchestrationService.Verify(
      service => service.UpdateInvoiceObject(invoice, invoiceId, null, It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Verifies that a malformed numeric snapshot is rejected before loading or writing an invoice.
  /// </summary>
  [TestMethod]
  public async Task UpdateProduct_NegativeOriginalQuantity_ThrowsTypedValidationWithoutReading()
  {
    // Arrange
    var selector = new ProductUpdateSelector(
      OriginalProductCode: null,
      OriginalName: "Coffee",
      OriginalQuantity: -1m,
      OriginalUnitPrice: 10m,
      OriginalTotalPrice: -10m,
      OccurrenceOrdinal: null);

    // Act + Assert
    InvoiceProcessingServiceValidationException exception =
      await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceValidationException>(() =>
        service.UpdateProduct(
          selector,
          new Product { Name = "Replacement", Quantity = 1m, Price = 10m },
          Guid.NewGuid(),
          null,
          CancellationToken.None));

    Assert.IsInstanceOfType<ProductUpdateSelectorValidationException>(exception.InnerException);
    mockInvoiceOrchestrationService.Verify(
      service => service.ReadInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()),
      Times.Never);
    mockInvoiceOrchestrationService.Verify(
      service => service.UpdateInvoiceObject(
        It.IsAny<Invoice>(),
        It.IsAny<Guid>(),
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()),
      Times.Never);
  }

  /// <summary>
  /// Validates getting products from an invoice.
  /// </summary>
  [TestMethod]
  public async Task GetProducts_ValidInvoice_ReturnsProducts()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.GetProducts(invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
  }

  /// <summary>
  /// Validates getting products returns empty collection when invoice has no products.
  /// </summary>
  [TestMethod]
  public async Task GetProducts_EmptyProducts_ReturnsEmptyCollection()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Items.Clear();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.GetProducts(invoiceId, null, CancellationToken.None);

    // Assert
    Assert.IsEmpty(result);
  }

  /// <summary>
  /// Validates getting a specific product by name.
  /// </summary>
  [TestMethod]
  public async Task GetProduct_ValidProductName_ReturnsProduct()
  {
    // Arrange
    var productName = "Test Product";
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Items.Clear();
    invoice.Items.Add(new Product { Name = productName });

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.GetProduct(productName, invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(productName, result.Name);
  }

  /// <summary>
  /// Verifies that sequential duplicate deletions remove the requested current occurrence each time.
  /// </summary>
  [TestMethod]
  public async Task DeleteProduct_SequentialDuplicateSnapshots_RemovesIntendedRows()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var first = new Product { Name = "Instant Coffee", Quantity = 1m, Price = 10m };
    var second = new Product { Name = "Instant Coffee", Quantity = 1m, Price = 10m };
    var third = new Product { Name = "Instant Coffee", Quantity = 1m, Price = 10m };
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Items = [first, second, third];
    var selector = new ProductUpdateSelector(
      OriginalProductCode: null,
      OriginalName: " instant   coffee ",
      OriginalQuantity: 1m,
      OriginalUnitPrice: 10m,
      OriginalTotalPrice: 10m,
      OccurrenceOrdinal: 1);

    mockInvoiceOrchestrationService
      .Setup(service => service.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    mockInvoiceOrchestrationService
      .Setup(service => service.UpdateInvoiceObject(invoice, invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    // Act
    await service.DeleteProduct(selector, invoiceId, null, CancellationToken.None);
    await service.DeleteProduct(selector, invoiceId, null, CancellationToken.None);

    // Assert
    CollectionAssert.AreEqual(new List<Product> { first }, invoice.Items.ToList());
    mockInvoiceOrchestrationService.Verify(
      service => service.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()),
      Times.Exactly(2));
    mockInvoiceOrchestrationService.Verify(
      service => service.UpdateInvoiceObject(invoice, invoiceId, null, It.IsAny<CancellationToken>()),
      Times.Exactly(2));
  }

  /// <summary>
  /// Verifies that an occurrence ordinal selects the intended product when product codes are duplicated.
  /// </summary>
  [TestMethod]
  public async Task DeleteProduct_DuplicateProductCodesWithOrdinal_RemovesSpecifiedRow()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var other = new Product { Name = "Other", ProductCode = "other-code", Quantity = 1m, Price = 10m };
    var firstDuplicate = new Product { Name = "First", ProductCode = "duplicate-code", Quantity = 1m, Price = 10m };
    var secondDuplicate = new Product { Name = "Second", ProductCode = "duplicate-code", Quantity = 2m, Price = 20m };
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Items = [other, firstDuplicate, secondDuplicate];
    var selector = new ProductUpdateSelector(
      OriginalProductCode: " duplicate-code ",
      OriginalName: null,
      OriginalQuantity: null,
      OriginalUnitPrice: null,
      OriginalTotalPrice: null,
      OccurrenceOrdinal: 1);

    mockInvoiceOrchestrationService
      .Setup(service => service.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    mockInvoiceOrchestrationService
      .Setup(service => service.UpdateInvoiceObject(invoice, invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    // Act
    await service.DeleteProduct(selector, invoiceId, null, CancellationToken.None);

    // Assert
    CollectionAssert.AreEqual(new List<Product> { other, firstDuplicate }, invoice.Items.ToList());
    mockInvoiceOrchestrationService.Verify(
      service => service.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()),
      Times.Once);
    mockInvoiceOrchestrationService.Verify(
      service => service.UpdateInvoiceObject(invoice, invoiceId, null, It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Verifies that an unmatched product deletion produces a typed not-found error without an aggregate write.
  /// </summary>
  [TestMethod]
  public async Task DeleteProduct_CompositeSnapshotMismatch_ThrowsTypedNotFoundWithoutWriting()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Items = [new Product { Name = "Coffee", Quantity = 1m, Price = 10m }];
    var selector = new ProductUpdateSelector(
      OriginalProductCode: null,
      OriginalName: "Coffee",
      OriginalQuantity: 1m,
      OriginalUnitPrice: 9m,
      OriginalTotalPrice: 9m,
      OccurrenceOrdinal: null);

    mockInvoiceOrchestrationService
      .Setup(service => service.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    // Act + Assert
    InvoiceProcessingServiceException exception =
      await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceException>(() =>
        service.DeleteProduct(selector, invoiceId, null, CancellationToken.None));

    Assert.IsInstanceOfType<ProductNotFoundException>(exception.InnerException);
    mockInvoiceOrchestrationService.Verify(
      service => service.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()),
      Times.Once);
    mockInvoiceOrchestrationService.Verify(
      service => service.UpdateInvoiceObject(
        It.IsAny<Invoice>(),
        It.IsAny<Guid>(),
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()),
      Times.Never);
  }

  /// <summary>
  /// Verifies that an out-of-range occurrence is rejected after loading but before writing the aggregate.
  /// </summary>
  [TestMethod]
  public async Task DeleteProduct_OccurrenceOrdinalOutOfRange_ThrowsTypedValidationWithoutWriting()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Items =
    [
      new Product { Name = "Coffee", Quantity = 1m, Price = 10m },
      new Product { Name = "Coffee", Quantity = 1m, Price = 10m },
    ];
    var selector = new ProductUpdateSelector(
      OriginalProductCode: null,
      OriginalName: "Coffee",
      OriginalQuantity: 1m,
      OriginalUnitPrice: 10m,
      OriginalTotalPrice: 10m,
      OccurrenceOrdinal: 2);

    mockInvoiceOrchestrationService
      .Setup(service => service.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    // Act + Assert
    InvoiceProcessingServiceValidationException exception =
      await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceValidationException>(() =>
        service.DeleteProduct(selector, invoiceId, null, CancellationToken.None));

    Assert.IsInstanceOfType<ProductUpdateSelectorOccurrenceOutOfRangeException>(exception.InnerException);
    mockInvoiceOrchestrationService.Verify(
      service => service.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()),
      Times.Once);
    mockInvoiceOrchestrationService.Verify(
      service => service.UpdateInvoiceObject(
        It.IsAny<Invoice>(),
        It.IsAny<Guid>(),
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()),
      Times.Never);
  }

  /// <summary>
  /// Verifies that malformed selector input is rejected before loading or writing an invoice.
  /// </summary>
  [TestMethod]
  public async Task DeleteProduct_NegativeOriginalQuantity_ThrowsTypedValidationWithoutReading()
  {
    // Arrange
    var selector = new ProductUpdateSelector(
      OriginalProductCode: null,
      OriginalName: "Coffee",
      OriginalQuantity: -1m,
      OriginalUnitPrice: 10m,
      OriginalTotalPrice: -10m,
      OccurrenceOrdinal: null);

    // Act + Assert
    InvoiceProcessingServiceValidationException exception =
      await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceValidationException>(() =>
        service.DeleteProduct(selector, Guid.NewGuid(), null, CancellationToken.None));

    Assert.IsInstanceOfType<ProductUpdateSelectorValidationException>(exception.InnerException);
    mockInvoiceOrchestrationService.Verify(
      service => service.ReadInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()),
      Times.Never);
    mockInvoiceOrchestrationService.Verify(
      service => service.UpdateInvoiceObject(
        It.IsAny<Invoice>(),
        It.IsAny<Guid>(),
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()),
      Times.Never);
  }

  /// <summary>
  /// Validates adding product with empty GUID identifier.
  /// </summary>
  [TestMethod]
  public async Task AddProduct_EmptyGuidInvoiceId_CallsOrchestration()
  {
    // Arrange
    var product = new Product { Name = "Test" };
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(Guid.Empty, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);
    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), Guid.Empty, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await service.AddProduct(product, Guid.Empty, null, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.ReadInvoiceObject(Guid.Empty, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  #endregion

  #region Scan Management Edge Cases

  /// <summary>
  /// Validates creating an invoice scan.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceScan_ValidScan_CreatesSuccessfully()
  {
    // Arrange
    var scan = new InvoiceScan(ScanType.JPG, new Uri("https://example.com/scan.jpg"), null);
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.AttachInvoiceScanAsync(scan, invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await service.CreateInvoiceScan(scan, invoiceId, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(
      s => s.AttachInvoiceScanAsync(scan, invoiceId, userId, It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Validates reading invoice scans.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceScans_ValidInvoice_ReturnsScans()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.ReadInvoiceScans(invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
  }

  /// <summary>
  /// Validates deleting an invoice scan.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceScan_ValidScan_DeletesSuccessfully()
  {
    // Arrange
    var scan = new InvoiceScan(ScanType.JPG, new Uri("https://example.com/scan.jpg"), null);
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);
    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await service.DeleteInvoiceScan(scan, invoiceId, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates creating scan with PNG type.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceScan_PngType_CreatesSuccessfully()
  {
    // Arrange
    var scan = new InvoiceScan(ScanType.PNG, new Uri("https://example.com/scan.png"), null);
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.AttachInvoiceScanAsync(scan, invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await service.CreateInvoiceScan(scan, invoiceId, null, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(
      s => s.AttachInvoiceScanAsync(scan, invoiceId, null, It.IsAny<CancellationToken>()),
      Times.Once);
  }

  #endregion

  #region Metadata Management Edge Cases

  /// <summary>
  /// Validates adding metadata to an invoice.
  /// </summary>
  [TestMethod]
  public async Task AddMetadataToInvoice_ValidMetadata_AddsSuccessfully()
  {
    // Arrange
    var metadata = new Dictionary<string, object> { { "key1", "value1" }, { "key2", 123 } };
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);
    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await service.AddMetadataToInvoice(metadata, invoiceId, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates updating metadata on an invoice.
  /// </summary>
  [TestMethod]
  public async Task UpdateMetadataOnInvoice_ValidMetadata_ReturnsUpdatedMetadata()
  {
    // Arrange
    var metadata = new Dictionary<string, object> { { "key1", "value1" } };
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);
    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.UpdateMetadataOnInvoice(metadata, invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
  }

  /// <summary>
  /// Validates getting metadata from an invoice.
  /// </summary>
  [TestMethod]
  public async Task GetMetadataFromInvoice_ValidInvoice_ReturnsMetadata()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.GetMetadataFromInvoice(invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
  }

  /// <summary>
  /// Validates deleting metadata from an invoice.
  /// </summary>
  [TestMethod]
  public async Task DeleteMetadataFromInvoice_ValidKeys_DeletesSuccessfully()
  {
    // Arrange
    var keys = new[] { "key1", "key2" };
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.AdditionalMetadata.Add("key1", "value1");
    invoice.AdditionalMetadata.Add("key2", "value2");

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);
    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await service.DeleteMetadataFromInvoice(keys, invoiceId, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates adding empty metadata dictionary.
  /// </summary>
  [TestMethod]
  public async Task AddMetadataToInvoice_EmptyMetadata_CompletesSuccessfully()
  {
    // Arrange
    var metadata = new Dictionary<string, object>();
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);
    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await service.AddMetadataToInvoice(metadata, invoiceId, null, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  #endregion

  #region Merchant Processing Edge Cases

  /// <summary>
  /// Validates merchant creation through processing service.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchant_ValidMerchant_CreatesSuccessfully()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var parentCompanyId = Guid.NewGuid();

    mockMerchantOrchestrationService
        .Setup(s => s.CreateMerchantObject(merchant, parentCompanyId, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await service.CreateMerchant(merchant, parentCompanyId, CancellationToken.None);

    // Assert
    mockMerchantOrchestrationService.Verify(s => s.CreateMerchantObject(merchant, parentCompanyId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates merchant creation with null parent company ID.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchant_NullParentCompanyId_CreatesSuccessfully()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockMerchantOrchestrationService
        .Setup(s => s.CreateMerchantObject(merchant, null, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await service.CreateMerchant(merchant, null, CancellationToken.None);

    // Assert
    mockMerchantOrchestrationService.Verify(s => s.CreateMerchantObject(merchant, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates merchant read through processing service.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchant_ValidIdentifier_ReturnsMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockMerchantOrchestrationService
        .Setup(s => s.ReadMerchantObject(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await service.ReadMerchant(merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreSame(expectedMerchant, result);
  }

  /// <summary>
  /// Validates merchant read with null parent company ID.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchant_NullParentCompanyId_ReturnsMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockMerchantOrchestrationService
        .Setup(s => s.ReadMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await service.ReadMerchant(merchantId, null, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
  }

  /// <summary>
  /// Validates reading all merchants through processing service.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchants_ValidParentCompanyId_ReturnsAllMerchants()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchants = Enumerable.Range(0, 5)
        .Select(_ => MerchantTestDataBuilder.CreateRandomMerchant())
        .ToList();

    mockMerchantOrchestrationService
        .Setup(s => s.ReadAllMerchantObjects(parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchants);

    // Act
    var result = await service.ReadMerchants(parentCompanyId, CancellationToken.None);

    // Assert
    Assert.AreEqual(5, result.Count());
  }

  /// <summary>
  /// Validates merchant update through processing service.
  /// </summary>
  [TestMethod]
  public async Task UpdateMerchant_ValidData_ReturnsUpdatedMerchant()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockMerchantOrchestrationService
        .Setup(s => s.UpdateMerchantObject(merchant, merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(merchant);

    // Act
    var result = await service.UpdateMerchant(merchant, merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
  }

  /// <summary>
  /// Validates merchant deletion through processing service.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchant_ValidIdentifier_DeletesSuccessfully()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockMerchantOrchestrationService
        .Setup(s => s.DeleteMerchantObject(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await service.DeleteMerchant(merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    mockMerchantOrchestrationService.Verify(s => s.DeleteMerchantObject(merchantId, parentCompanyId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates merchant deletion with null parent company ID.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchant_NullParentCompanyId_DeletesSuccessfully()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockMerchantOrchestrationService
        .Setup(s => s.DeleteMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await service.DeleteMerchant(merchantId, null, CancellationToken.None);

    // Assert
    mockMerchantOrchestrationService.Verify(s => s.DeleteMerchantObject(merchantId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  #endregion

  #region Exception Handling Tests

  /// <summary>
  /// Validates orchestration exception is wrapped during product addition.
  /// </summary>
  [TestMethod]
  public async Task AddProduct_OrchestrationException_ThrowsProcessingException()
  {
    // Arrange
    var product = new Product { Name = "Test" };
    var invoiceId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvoiceOrchestrationServiceException(new InvalidOperationException("Error")));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceException>(() =>
        service.AddProduct(product, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates orchestration validation exception is wrapped during product deletion.
  /// </summary>
  [TestMethod]
  public async Task DeleteProduct_OrchestrationValidationException_ThrowsProcessingValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var selector = new ProductUpdateSelector(
      OriginalProductCode: "test-product",
      OriginalName: null,
      OriginalQuantity: null,
      OriginalUnitPrice: null,
      OriginalTotalPrice: null,
      OccurrenceOrdinal: null);

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvoiceOrchestrationValidationException(new InvalidOperationException("Validation error")));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceValidationException>(() =>
        service.DeleteProduct(selector, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates merchant orchestration exception is wrapped during creation.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchant_OrchestrationException_ThrowsProcessingException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockMerchantOrchestrationService
        .Setup(s => s.CreateMerchantObject(merchant, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new MerchantOrchestrationServiceException(new InvalidOperationException("Error")));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceException>(() =>
        service.CreateMerchant(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates merchant orchestration validation exception is wrapped during update.
  /// </summary>
  [TestMethod]
  public async Task UpdateMerchant_OrchestrationValidationException_ThrowsProcessingDependencyValidationException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var merchantId = Guid.NewGuid();

    mockMerchantOrchestrationService
        .Setup(s => s.UpdateMerchantObject(merchant, merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new MerchantOrchestrationServiceValidationException(new InvalidOperationException("Validation error")));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceDependencyValidationException>(() =>
        service.UpdateMerchant(merchant, merchantId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates generic exception during scan creation is wrapped.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceScan_GenericException_ThrowsProcessingException()
  {
    // Arrange
    var scan = new InvoiceScan(ScanType.JPG, new Uri("https://example.com/scan.jpg"), null);
    var invoiceId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.AttachInvoiceScanAsync(scan, invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceException>(() =>
        service.CreateInvoiceScan(scan, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates generic exception during metadata update is wrapped.
  /// </summary>
  [TestMethod]
  public async Task UpdateMetadataOnInvoice_GenericException_ThrowsProcessingException()
  {
    // Arrange
    var metadata = new Dictionary<string, object> { { "key", "value" } };
    var invoiceId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceException>(() =>
        service.UpdateMetadataOnInvoice(metadata, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates dependency exception is wrapped during product get.
  /// </summary>
  [TestMethod]
  public async Task GetProducts_DependencyException_ThrowsProcessingDependencyException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvoiceOrchestrationDependencyException(new InvalidOperationException("Dependency error")));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceDependencyException>(() =>
        service.GetProducts(invoiceId, null, CancellationToken.None));
  }

  #endregion

  #region Concurrent Operation Tests

  /// <summary>
  /// Validates concurrent product additions complete successfully.
  /// </summary>
  [TestMethod]
  public async Task AddProduct_ConcurrentOperations_AllComplete()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);
    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    var products = Enumerable.Range(0, 5)
        .Select(i => new Product { Name = $"Product {i}" })
        .ToList();

    // Act
    var tasks = products.Select(p => service.AddProduct(p, invoiceId, null, CancellationToken.None));
    await Task.WhenAll(tasks);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, null, It.IsAny<CancellationToken>()), Times.Exactly(5));
  }

  /// <summary>
  /// Validates concurrent merchant reads complete successfully.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchant_ConcurrentOperations_AllComplete()
  {
    // Arrange
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockMerchantOrchestrationService
        .Setup(s => s.ReadMerchantObject(It.IsAny<Guid>(), null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchant);

    // Act
    var tasks = Enumerable.Range(0, 10)
        .Select(_ => service.ReadMerchant(Guid.NewGuid(), null, CancellationToken.None));
    var results = await Task.WhenAll(tasks);

    // Assert
    foreach (var r in results)
    {
      Assert.IsNotNull(r);
    }
  }

  /// <summary>
  /// Validates concurrent metadata operations complete successfully.
  /// </summary>
  [TestMethod]
  public async Task GetMetadataFromInvoice_ConcurrentOperations_AllComplete()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(It.IsAny<Guid>(), null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var tasks = Enumerable.Range(0, 10)
        .Select(_ => service.GetMetadataFromInvoice(Guid.NewGuid(), null, CancellationToken.None));
    var results = await Task.WhenAll(tasks);

    // Assert
    foreach (var r in results)
    {
      Assert.IsNotNull(r);
    }
  }

  #endregion

  #region Delete Operations Tests

  /// <summary>
  /// Validates single invoice deletion.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoice_ValidIdentifier_DeletesSuccessfully()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.DeleteInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await service.DeleteInvoice(invoiceId, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.DeleteInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates invoice deletion with null user identifier.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoice_NullUserIdentifier_DeletesSuccessfully()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await service.DeleteInvoice(invoiceId, null, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  #endregion
}
