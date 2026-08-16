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
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Extensions.Logging;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Comprehensive unit tests for <see cref="InvoiceProcessingService"/> targeting 95%+ code coverage.
/// Tests validate processing logic, exception handling, orchestration service coordination.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
[TestClass]
public sealed class InvoiceProcessingServiceTests
{
  private readonly Mock<IInvoiceOrchestrationService> mockInvoiceOrchestrationService;
  private readonly Mock<IMerchantOrchestrationService> mockMerchantOrchestrationService;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IInvoiceProcessingService>> mockLogger;
  private readonly InvoiceProcessingService processingService;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies for isolated processing service testing.
  /// </summary>
  public InvoiceProcessingServiceTests()
  {
    mockInvoiceOrchestrationService = new Mock<IInvoiceOrchestrationService>();
    mockMerchantOrchestrationService = new Mock<IMerchantOrchestrationService>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IInvoiceProcessingService>>();

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
        .Returns(mockLogger.Object);

    processingService = new InvoiceProcessingService(
        mockInvoiceOrchestrationService.Object,
        mockMerchantOrchestrationService.Object,
        mockLoggerFactory.Object);
  }

  #region Constructor Tests

  /// <summary>
  /// Verifies constructor throws ArgumentNullException when invoice orchestration service is null.
  /// </summary>
  [TestMethod]
  public void Constructor_NullInvoiceOrchestrationService_ThrowsArgumentNullException() =>
      Assert.ThrowsExactly<ArgumentNullException>(() =>
          new InvoiceProcessingService(null!, mockMerchantOrchestrationService.Object, mockLoggerFactory.Object));

  /// <summary>
  /// Verifies constructor throws ArgumentNullException when merchant orchestration service is null.
  /// </summary>
  [TestMethod]
  public void Constructor_NullMerchantOrchestrationService_ThrowsArgumentNullException() =>
      Assert.ThrowsExactly<ArgumentNullException>(() =>
          new InvoiceProcessingService(mockInvoiceOrchestrationService.Object, null!, mockLoggerFactory.Object));

  /// <summary>
  /// Validates successful instantiation with all valid dependencies.
  /// </summary>
  [TestMethod]
  public void Constructor_ValidDependencies_CreatesInstance()
  {
    // Arrange & Act
    var service = new InvoiceProcessingService(
        mockInvoiceOrchestrationService.Object,
        mockMerchantOrchestrationService.Object,
        mockLoggerFactory.Object);

    // Assert
    Assert.IsNotNull(service);
  }

  #endregion

  #region CreateInvoice Tests

  /// <summary>
  /// Validates successful invoice creation.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoice_ValidInvoice_CallsOrchestrationService()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var userId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.CreateInvoiceObject(invoice, It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await processingService.CreateInvoice(invoice, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.CreateInvoiceObject(invoice, It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates orchestration service exception is wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoice_OrchestrationServiceException_ThrowsProcessingServiceException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new InvalidOperationException("Service error");
    var orchException = new InvoiceOrchestrationServiceException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.CreateInvoiceObject(invoice, It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceException>(() =>
        processingService.CreateInvoice(invoice, null, CancellationToken.None));
  }

  #endregion

  #region ReadInvoice Tests

  /// <summary>
  /// Validates successful invoice retrieval.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoice_ValidIdentifier_ReturnsInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var expectedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedInvoice);

    // Act
    var result = await processingService.ReadInvoice(invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(expectedInvoice.id, result.id);
  }

  /// <summary>
  /// Validates orchestration validation exception is wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoice_OrchestrationValidationException_ThrowsProcessingValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new ArgumentException("Invalid ID");
    var orchException = new InvoiceOrchestrationValidationException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceValidationException>(() =>
        processingService.ReadInvoice(invoiceId, null, CancellationToken.None));
  }

  #endregion

  #region ReadInvoices Tests

  /// <summary>
  /// Validates successful bulk invoice retrieval.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoices_ValidUserId_ReturnsInvoiceCollection()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var expectedInvoices = InvoiceBuilder.CreateMultipleRandomInvoices(5);

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedInvoices);

    // Act
    var result = await processingService.ReadInvoices(userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(5, result.Count());
  }

  /// <summary>
  /// Validates empty collection returned when no invoices exist.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoices_NoInvoices_ReturnsEmptyCollection()
  {
    // Arrange
    var userId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(new List<Invoice>());

    // Act
    var result = await processingService.ReadInvoices(userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.IsEmpty(result);
  }

  #endregion

  #region UpdateInvoice Tests

  /// <summary>
  /// Validates successful invoice update.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoice_ValidUpdate_ReturnsUpdatedInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(updatedInvoice);

    // Act
    var result = await processingService.UpdateInvoice(updatedInvoice, invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(updatedInvoice.id, result.id);
  }

  /// <summary>
  /// Validates orchestration dependency validation exception is wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoice_OrchestrationDependencyValidationException_ThrowsProcessingDependencyValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new ArgumentException("Invalid data");
    var orchException = new InvoiceOrchestrationDependencyValidationException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceDependencyValidationException>(() =>
        processingService.UpdateInvoice(updatedInvoice, invoiceId, null, CancellationToken.None));
  }

  #endregion

  #region DeleteInvoice Tests

  /// <summary>
  /// Validates successful invoice deletion.
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
    await processingService.DeleteInvoice(invoiceId, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.DeleteInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  #endregion

  #region DeleteInvoices Tests

  /// <summary>
  /// Validates successful bulk invoice deletion.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoices_ValidUserId_DeletesAllInvoices()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var invoices = InvoiceBuilder.CreateMultipleRandomInvoices(3);

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoices);

    mockInvoiceOrchestrationService
        .Setup(s => s.DeleteInvoiceObject(It.IsAny<Guid>(), userId, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await processingService.DeleteInvoices(userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()), Times.Once);
    mockInvoiceOrchestrationService.Verify(s => s.DeleteInvoiceObject(It.IsAny<Guid>(), userId, It.IsAny<CancellationToken>()), Times.Exactly(3));
  }

  /// <summary>
  /// Validates no deletions when no invoices exist.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoices_NoInvoices_PerformsNoDeletions()
  {
    // Arrange
    var userId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(new List<Invoice>());

    // Act
    await processingService.DeleteInvoices(userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.DeleteInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Never);
  }

  #endregion

  #region AddProduct Tests

  /// <summary>
  /// Validates successful product addition to invoice.
  /// </summary>
  [TestMethod]
  public async Task AddProduct_ValidProduct_AddsToInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var initialCount = invoice.Items.Count;
    var product = new Product { Name = "Test Product", Price = 10m };

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await processingService.AddProduct(product, invoiceId, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
    mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  #endregion

  #region GetProducts Tests

  /// <summary>
  /// Validates successful products retrieval from invoice.
  /// </summary>
  [TestMethod]
  public async Task GetProducts_ValidInvoiceId_ReturnsProductCollection()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await processingService.GetProducts(invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(invoice.Items.Count, result.Count());
  }

  #endregion

  #region GetProduct Tests

  /// <summary>
  /// Validates successful product retrieval by name.
  /// </summary>
  [TestMethod]
  public async Task GetProduct_ExistingProduct_ReturnsProduct()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var productName = invoice.Items.First().Name;

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await processingService.GetProduct(productName, invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
  }

  /// <summary>
  /// Validates default product returned when product not found.
  /// </summary>
  [TestMethod]
  public async Task GetProduct_NonExistingProduct_ReturnsDefaultProduct()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await processingService.GetProduct("NonExistingProduct12345", invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
  }

  #endregion

  #region DeleteProduct Tests

  /// <summary>
  /// Validates successful product deletion by name.
  /// </summary>
  [TestMethod]
  public async Task DeleteProductByName_ExistingProduct_RemovesFromInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var productName = invoice.Items.First().Name;

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await processingService.DeleteProduct(productName, invoiceId, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates successful product deletion by product object.
  /// </summary>
  [TestMethod]
  public async Task DeleteProductByObject_ExistingProduct_RemovesFromInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var product = invoice.Items.First();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await processingService.DeleteProduct(product, invoiceId, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  #endregion

  #region CreateInvoiceScan Tests

  /// <summary>
  /// Validates successful scan creation.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceScan_ValidScan_AddsToInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var scan = new InvoiceScan(ScanType.JPG, new Uri("https://example.com/scan.jpg"), null);

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await processingService.CreateInvoiceScan(scan, invoiceId, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  #endregion

  #region ReadInvoiceScans Tests

  /// <summary>
  /// Validates successful scan retrieval.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceScans_ValidInvoiceId_ReturnsScanCollection()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await processingService.ReadInvoiceScans(invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
  }

  #endregion

  #region DeleteInvoiceScan Tests

  /// <summary>
  /// Validates successful scan deletion.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceScan_ValidScan_RemovesFromInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var scan = new InvoiceScan(ScanType.JPG, new Uri("https://example.com/scan.jpg"), null);
    invoice.Scans.Add(scan);

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await processingService.DeleteInvoiceScan(scan, invoiceId, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  #endregion

  #region AddMetadataToInvoice Tests

  /// <summary>
  /// Validates successful metadata addition to invoice.
  /// </summary>
  [TestMethod]
  public async Task AddMetadataToInvoice_ValidMetadata_AddsToInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var metadata = new Dictionary<string, object> { { "key1", "value1" }, { "key2", 123 } };

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await processingService.AddMetadataToInvoice(metadata, invoiceId, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  #endregion

  #region UpdateMetadataOnInvoice Tests

  /// <summary>
  /// Validates successful metadata update on invoice.
  /// </summary>
  [TestMethod]
  public async Task UpdateMetadataOnInvoice_ValidMetadata_ReturnsUpdatedMetadata()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var metadata = new Dictionary<string, object> { { "key1", "value1" } };

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await processingService.UpdateMetadataOnInvoice(metadata, invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
  }

  #endregion

  #region GetMetadataFromInvoice Tests

  /// <summary>
  /// Validates successful metadata retrieval from invoice.
  /// </summary>
  [TestMethod]
  public async Task GetMetadataFromInvoice_ValidInvoiceId_ReturnsMetadata()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.AdditionalMetadata["testKey"] = "testValue";

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await processingService.GetMetadataFromInvoice(invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.IsTrue(result.ContainsKey("testKey"));
  }

  #endregion

  #region DeleteMetadataFromInvoice Tests

  /// <summary>
  /// Validates successful metadata deletion from invoice.
  /// </summary>
  [TestMethod]
  public async Task DeleteMetadataFromInvoice_ValidKeys_RemovesMetadata()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.AdditionalMetadata["key1"] = "value1";
    invoice.AdditionalMetadata["key2"] = "value2";
    var keysToDelete = new List<string> { "key1" };

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await processingService.DeleteMetadataFromInvoice(keysToDelete, invoiceId, userId, CancellationToken.None);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  #endregion

  #region CreateMerchant Tests

  /// <summary>
  /// Validates successful merchant creation.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchant_ValidMerchant_CallsOrchestrationService()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var parentCompanyId = Guid.NewGuid();

    mockMerchantOrchestrationService
        .Setup(s => s.CreateMerchantObject(merchant, parentCompanyId, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await processingService.CreateMerchant(merchant, parentCompanyId, CancellationToken.None);

    // Assert
    mockMerchantOrchestrationService.Verify(s => s.CreateMerchantObject(merchant, parentCompanyId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates merchant orchestration service exception is wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchant_OrchestrationServiceException_ThrowsProcessingServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var innerException = new InvalidOperationException("Service error");
    var orchException = new MerchantOrchestrationServiceException(innerException);

    mockMerchantOrchestrationService
        .Setup(s => s.CreateMerchantObject(merchant, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceException>(() =>
        processingService.CreateMerchant(merchant, null, CancellationToken.None));
  }

  #endregion

  #region ReadMerchant Tests

  /// <summary>
  /// Validates successful merchant retrieval.
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
    var result = await processingService.ReadMerchant(merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(expectedMerchant.id, result.id);
  }

  /// <summary>
  /// Validates merchant orchestration validation exception is wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchant_OrchestrationValidationException_ThrowsProcessingDependencyValidationException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var innerException = new ArgumentException("Invalid ID");
    var orchException = new MerchantOrchestrationServiceValidationException(innerException);

    mockMerchantOrchestrationService
        .Setup(s => s.ReadMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceDependencyValidationException>(() =>
        processingService.ReadMerchant(merchantId, null, CancellationToken.None));
  }

  #endregion

  #region ReadMerchants Tests

  /// <summary>
  /// Validates successful bulk merchant retrieval.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchants_ValidParentCompanyId_ReturnsMerchantCollection()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchants = MerchantTestDataBuilder.CreateMultipleRandomMerchants(5);

    mockMerchantOrchestrationService
        .Setup(s => s.ReadAllMerchantObjects(parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchants);

    // Act
    var result = await processingService.ReadMerchants(parentCompanyId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(5, result.Count());
  }

  /// <summary>
  /// Validates merchant orchestration dependency exception is wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchants_OrchestrationDependencyException_ThrowsProcessingDependencyException()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Database error");
    var orchException = new MerchantOrchestrationServiceDependencyException(innerException);

    mockMerchantOrchestrationService
        .Setup(s => s.ReadAllMerchantObjects(parentCompanyId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceDependencyException>(() =>
        processingService.ReadMerchants(parentCompanyId, CancellationToken.None));
  }

  #endregion

  #region UpdateMerchant Tests

  /// <summary>
  /// Validates successful merchant update.
  /// </summary>
  [TestMethod]
  public async Task UpdateMerchant_ValidUpdate_ReturnsUpdatedMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockMerchantOrchestrationService
        .Setup(s => s.UpdateMerchantObject(updatedMerchant, merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(updatedMerchant);

    // Act
    var result = await processingService.UpdateMerchant(updatedMerchant, merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(updatedMerchant.id, result.id);
  }

  /// <summary>
  /// Validates merchant orchestration dependency validation exception is wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task UpdateMerchant_OrchestrationDependencyValidationException_ThrowsProcessingDependencyValidationException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var innerException = new ArgumentException("Invalid data");
    var orchException = new MerchantOrchestrationServiceDependencyValidationException(innerException);

    mockMerchantOrchestrationService
        .Setup(s => s.UpdateMerchantObject(updatedMerchant, merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceDependencyValidationException>(() =>
        processingService.UpdateMerchant(updatedMerchant, merchantId, null, CancellationToken.None));
  }

  #endregion

  #region DeleteMerchant Tests

  /// <summary>
  /// Validates successful merchant deletion.
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
    await processingService.DeleteMerchant(merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    mockMerchantOrchestrationService.Verify(s => s.DeleteMerchantObject(merchantId, parentCompanyId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates generic exception during merchant deletion is wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchant_GenericException_ThrowsProcessingServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockMerchantOrchestrationService
        .Setup(s => s.DeleteMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceException>(() =>
        processingService.DeleteMerchant(merchantId, null, CancellationToken.None));
  }

  #endregion

  #region Test Data

  /// <summary>
  /// Provides theory data containing several randomized invoices for parameterized tests.
  /// </summary>
  public static IEnumerable<object[]> GetInvoiceTestData() => InvoiceBuilder.GetInvoiceTheoryData();

  /// <summary>
  /// Provides theory data containing several randomized merchants for parameterized tests.
  /// </summary>
  public static IEnumerable<object[]> GetMerchantTestData() => MerchantTestDataBuilder.GetMerchantTheoryData();

  #endregion
}
