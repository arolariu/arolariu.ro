namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Extensions.Logging;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Comprehensive unit tests for <see cref="InvoiceOrchestrationService"/> targeting 99% code coverage.
/// Tests validate orchestration logic, exception handling, telemetry integration and foundation service coordination.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
[TestClass]
public sealed class InvoiceOrchestrationServiceTests
{
  private readonly Mock<IInvoiceStorageFoundationService> mockStorageService;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IInvoiceOrchestrationService>> mockLogger;
  private readonly InvoiceOrchestrationService orchestrationService;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies for isolated orchestration service testing.
  /// </summary>
  public InvoiceOrchestrationServiceTests()
  {
    mockStorageService = new Mock<IInvoiceStorageFoundationService>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IInvoiceOrchestrationService>>();

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
        .Returns(mockLogger.Object);

    mockLoggerFactory
      .Setup(factory => factory.CreateLogger(It.Is<string>(s => s.Contains("IInvoiceOrchestrationService"))))
      .Returns(mockLogger.Object);

    orchestrationService = new InvoiceOrchestrationService(
      mockStorageService.Object,
      mockLoggerFactory.Object);
  }

  #region Constructor Tests

  /// <summary>
  /// Verifies constructor throws ArgumentNullException when storage service is null.
  /// </summary>
  [TestMethod]
  public void Constructor_NullStorageService_ThrowsArgumentNullException() =>
    // Arrange & Act & Assert
    Assert.ThrowsExactly<ArgumentNullException>(() =>
      new InvoiceOrchestrationService(null!, mockLoggerFactory.Object));

  /// <summary>
  /// Validates successful instantiation with all valid dependencies.
  /// </summary>
  [TestMethod]
  public void Constructor_ValidDependencies_CreatesInstance()
  {
    // Arrange & Act
    var service = new InvoiceOrchestrationService(
      mockStorageService.Object,
      mockLoggerFactory.Object);

    // Assert
    Assert.IsNotNull(service);
  }

  #endregion

  #region CreateInvoiceObject Tests

  /// <summary>
  /// Validates successful invoice creation through orchestration layer.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_ValidInvoice_ReturnsCreatedInvoice()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var userId = Guid.NewGuid();

    mockStorageService
      .Setup(s => s.CreateInvoiceObject(invoice, userId, It.IsAny<CancellationToken>()));

    // Act
    var result = await orchestrationService.CreateInvoiceObject(invoice, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(invoice.id, result.id);
    mockStorageService.Verify(s => s.CreateInvoiceObject(invoice, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Ensures creation succeeds without user identifier.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_NoUserIdentifier_CreatesSuccessfully()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockStorageService
         .Setup(s => s.CreateInvoiceObject(invoice, null, It.IsAny<CancellationToken>()));

    // Act
    var result = await orchestrationService.CreateInvoiceObject(invoice, null, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    mockStorageService.Verify(s => s.CreateInvoiceObject(invoice, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Confirms foundation validation exceptions propagate as orchestration dependency validation exceptions during creation.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new ArgumentNullException("invoice");
    var foundationException = new InvoiceFoundationValidationException(innerException);

    mockStorageService
         .Setup(s => s.CreateInvoiceObject(invoice, null, It.IsAny<CancellationToken>()))
         .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationValidationException>(() =>
      orchestrationService.CreateInvoiceObject(invoice, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates foundation dependency exceptions during creation are wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new InvalidOperationException("Database unavailable");
    var foundationException = new InvoiceFoundationDependencyException(innerException);

    mockStorageService
      .Setup(s => s.CreateInvoiceObject(invoice, null, It.IsAny<CancellationToken>()))
      .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationDependencyException>(() =>
      orchestrationService.CreateInvoiceObject(invoice, null, CancellationToken.None));
  }

  /// <summary>
  /// Ensures generic exceptions during creation are wrapped into orchestration service exceptions.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var exception = new InvalidOperationException("Unexpected failure");

    mockStorageService
      .Setup(s => s.CreateInvoiceObject(invoice, null, It.IsAny<CancellationToken>()))
  .ThrowsAsync(exception);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
      orchestrationService.CreateInvoiceObject(invoice, null, CancellationToken.None));
  }

  #endregion

  #region AttachInvoiceScanAsync Tests

  /// <summary>
  /// Verifies a new scan is appended and persisted exactly once.
  /// </summary>
  [TestMethod]
  public async Task AttachInvoiceScanAsync_NewScan_AppendsAndPersistsOnce()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var scan = new InvoiceScan(
      ScanType.JPG,
      new Uri("https://example.test/scans/receipt.jpg"),
      new Dictionary<string, object> { ["pageNumber"] = 1 });

    mockStorageService
      .Setup(s => s.ReadInvoiceObject(invoice.id, invoice.UserIdentifier, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    mockStorageService
      .Setup(s => s.UpdateInvoiceObject(invoice, invoice.id, invoice.UserIdentifier, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    // Act
    Invoice result = await orchestrationService.AttachInvoiceScanAsync(
      invoice.id,
      invoice.UserIdentifier,
      scan,
      CancellationToken.None);

    // Assert
    Assert.HasCount(1, result.Scans);
    Assert.AreEqual(scan, result.Scans.Single());
    mockStorageService.Verify(
      s => s.UpdateInvoiceObject(invoice, invoice.id, invoice.UserIdentifier, It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Verifies canonical scan identity ignores URI representation and metadata differences.
  /// </summary>
  [TestMethod]
  public async Task AttachInvoiceScanAsync_CanonicalIdentityAlreadyAttached_SucceedsWithoutPersistence()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var attachedScan = new InvoiceScan(
      ScanType.JPG,
      new Uri("HTTPS://EXAMPLE.TEST:443/scans/%72eceipt.jpg"),
      new Dictionary<string, object> { ["pageNumber"] = 1 });
    var repeatedScan = new InvoiceScan(
      ScanType.JPG,
      new Uri("https://example.test/scans/receipt.jpg"),
      new Dictionary<string, object> { ["pageNumber"] = 2 });
    invoice.Scans.Add(attachedScan);

    mockStorageService
      .Setup(s => s.ReadInvoiceObject(invoice.id, invoice.UserIdentifier, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    // Act
    Invoice result = await orchestrationService.AttachInvoiceScanAsync(
      invoice.id,
      invoice.UserIdentifier,
      repeatedScan,
      CancellationToken.None);

    // Assert
    Assert.HasCount(1, result.Scans);
    Assert.AreEqual(attachedScan, result.Scans.Single());
    mockStorageService.Verify(
      s => s.UpdateInvoiceObject(
        It.IsAny<Invoice>(),
        It.IsAny<Guid>(),
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()),
      Times.Never);
  }

  /// <summary>
  /// Verifies a retry after a committed write with a lost response does not append a second scan.
  /// </summary>
  [TestMethod]
  public async Task AttachInvoiceScanAsync_FirstCommitResponseLost_RetryDoesNotDuplicateScan()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var persistedScans = new List<InvoiceScan>();
    var scan = new InvoiceScan(
      ScanType.PNG,
      new Uri("https://example.test/scans/receipt.png"),
      null);

    mockStorageService
      .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
      .ReturnsAsync(() => new Invoice
      {
        id = invoiceId,
        UserIdentifier = userId,
        Scans = [.. persistedScans],
      });
    mockStorageService
      .Setup(s => s.UpdateInvoiceObject(
        It.IsAny<Invoice>(),
        invoiceId,
        userId,
        It.IsAny<CancellationToken>()))
      .Callback<Invoice, Guid, Guid?, CancellationToken>(
        (updatedInvoice, _, _, _) => persistedScans = [.. updatedInvoice.Scans])
      .ThrowsAsync(new InvoiceFoundationDependencyException(
        new TimeoutException("The commit succeeded, but its response was lost.")));

    // Act
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationDependencyException>(() =>
      orchestrationService.AttachInvoiceScanAsync(
        invoiceId,
        userId,
        scan,
        CancellationToken.None));
    Invoice retryResult = await orchestrationService.AttachInvoiceScanAsync(
      invoiceId,
      userId,
      scan,
      CancellationToken.None);

    // Assert
    Assert.HasCount(1, persistedScans);
    Assert.HasCount(1, retryResult.Scans);
    Assert.AreEqual(scan, retryResult.Scans.Single());
    mockStorageService.Verify(
      s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()),
      Times.Exactly(2));
    mockStorageService.Verify(
      s => s.UpdateInvoiceObject(
        It.IsAny<Invoice>(),
        invoiceId,
        userId,
        It.IsAny<CancellationToken>()),
      Times.Once);
  }

  #endregion

  #region ReadInvoiceObject Tests

  /// <summary>
  /// Validates successful retrieval of single invoice by identifier.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_ValidIdentifier_ReturnsInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var expectedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockStorageService
      .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
      .ReturnsAsync(expectedInvoice);

    // Act
    var result = await orchestrationService.ReadInvoiceObject(invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(expectedInvoice.id, result.id);
    mockStorageService.Verify(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Ensures read operation succeeds without user identifier.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_NoUserIdentifier_ReturnsInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var expectedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockStorageService
      .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(expectedInvoice);

    // Act
    var result = await orchestrationService.ReadInvoiceObject(invoiceId, null, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    mockStorageService.Verify(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Confirms foundation validation exceptions during read are wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new ArgumentException("Invalid identifier");
    var foundationException = new InvoiceFoundationValidationException(innerException);

    mockStorageService
      .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationValidationException>(() =>
      orchestrationService.ReadInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates foundation service exceptions during read propagate correctly.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_FoundationServiceException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Service failure");
    var foundationException = new InvoiceFoundationServiceException(innerException);

    mockStorageService
  .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
      orchestrationService.ReadInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  #endregion

  #region ReadAllInvoiceObjects Tests

  /// <summary>
  /// Validates successful retrieval of all invoices for a user.
  /// </summary>
  [TestMethod]
  public async Task ReadAllInvoiceObjects_WithUserIdentifier_ReturnsInvoiceCollection()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var expectedInvoices = InvoiceBuilder.CreateMultipleRandomInvoices(5);

    mockStorageService
      .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
.ReturnsAsync(expectedInvoices);

    // Act
    var result = await orchestrationService.ReadAllInvoiceObjects(userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(5, result.Count());
    mockStorageService.Verify(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates empty collection is returned when no invoices exist.
  /// </summary>
  [TestMethod]
  public async Task ReadAllInvoiceObjects_NoInvoices_ReturnsEmptyCollection()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var emptyList = new List<Invoice>();

    mockStorageService
      .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
      .ReturnsAsync(emptyList);

    // Act
    var result = await orchestrationService.ReadAllInvoiceObjects(userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.IsEmpty(result);
  }

  /// <summary>
  /// Confirms foundation dependency exceptions during bulk read are wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task ReadAllInvoiceObjects_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Query timeout");
    var foundationException = new InvoiceFoundationDependencyException(innerException);

    mockStorageService
      .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
      .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationDependencyException>(() =>
      orchestrationService.ReadAllInvoiceObjects(userId, CancellationToken.None));
  }

  /// <summary>
  /// Validates generic exceptions during bulk read propagate as orchestration service exceptions.
  /// </summary>
  [TestMethod]
  public async Task ReadAllInvoiceObjects_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var exception = new InvalidOperationException("Unexpected error");

    mockStorageService
      .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
      .ThrowsAsync(exception);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
      orchestrationService.ReadAllInvoiceObjects(userId, CancellationToken.None));
  }

  #endregion

  #region UpdateInvoiceObject Tests

  /// <summary>
  /// Validates successful invoice update through orchestration layer.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_ValidUpdate_ReturnsUpdatedInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockStorageService
      .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, userId, It.IsAny<CancellationToken>()))
      .ReturnsAsync(updatedInvoice);

    // Act
    var result = await orchestrationService.UpdateInvoiceObject(updatedInvoice, invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(updatedInvoice.id, result.id);
    mockStorageService.Verify(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Ensures update succeeds without user identifier.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_NoUserIdentifier_UpdatesSuccessfully()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockStorageService
      .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()))
   .ReturnsAsync(updatedInvoice);

    // Act
    var result = await orchestrationService.UpdateInvoiceObject(updatedInvoice, invoiceId, null, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    mockStorageService.Verify(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Confirms foundation validation exceptions during update are wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new ArgumentNullException("invoice");
    var foundationException = new InvoiceFoundationValidationException(innerException);

    mockStorageService
      .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()))
      .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationValidationException>(() =>
      orchestrationService.UpdateInvoiceObject(updatedInvoice, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates foundation dependency validation exceptions during update propagate correctly.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_FoundationDependencyValidationException_ThrowsOrchestrationDependencyValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new ArgumentException("Concurrent update");
    var foundationException = new InvoiceFoundationDependencyValidationException(innerException);

    mockStorageService
      .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()))
      .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationDependencyValidationException>(() =>
      orchestrationService.UpdateInvoiceObject(updatedInvoice, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Ensures generic exceptions during update are wrapped into orchestration service exceptions.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();
    var exception = new InvalidOperationException("Update failed");

    mockStorageService
      .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()))
      .ThrowsAsync(exception);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
      orchestrationService.UpdateInvoiceObject(updatedInvoice, invoiceId, null, CancellationToken.None));
  }

  #endregion

  #region DeleteInvoiceObject Tests

  /// <summary>
  /// Validates successful invoice deletion through orchestration layer.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_ValidIdentifier_DeletesSuccessfully()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();

    mockStorageService
      .Setup(s => s.DeleteInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
  .Returns(Task.CompletedTask);

    // Act
    await orchestrationService.DeleteInvoiceObject(invoiceId, userId, CancellationToken.None);

    // Assert
    mockStorageService.Verify(s => s.DeleteInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Ensures deletion succeeds without user identifier.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_NoUserIdentifier_DeletesSuccessfully()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockStorageService
      .Setup(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);

    // Act
    await orchestrationService.DeleteInvoiceObject(invoiceId, null, CancellationToken.None);

    // Assert
    mockStorageService.Verify(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Confirms foundation validation exceptions during delete are wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new ArgumentException("Invalid identifier");
    var foundationException = new InvoiceFoundationValidationException(innerException);

    mockStorageService
    .Setup(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
       .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationValidationException>(() =>
      orchestrationService.DeleteInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates foundation dependency exceptions during delete propagate correctly.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Foreign key constraint");
    var foundationException = new InvoiceFoundationDependencyException(innerException);

    mockStorageService
      .Setup(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationDependencyException>(() =>
      orchestrationService.DeleteInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Ensures foundation service exceptions during delete are wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_FoundationServiceException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Service error");
    var foundationException = new InvoiceFoundationServiceException(innerException);

    mockStorageService
    .Setup(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
      orchestrationService.DeleteInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates generic exceptions during delete are wrapped into orchestration service exceptions.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var exception = new InvalidOperationException("Deletion failed");

    mockStorageService
      .Setup(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ThrowsAsync(exception);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
      orchestrationService.DeleteInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates idempotency of delete operation (repeated calls succeed).
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_IdempotentCalls_SucceedMultipleTimes()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockStorageService
      .Setup(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
 .Returns(Task.CompletedTask);

    // Act
    await orchestrationService.DeleteInvoiceObject(invoiceId, null, CancellationToken.None);
    await orchestrationService.DeleteInvoiceObject(invoiceId, null, CancellationToken.None);
    await orchestrationService.DeleteInvoiceObject(invoiceId, null, CancellationToken.None);

    // Assert
    mockStorageService.Verify(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()), Times.Exactly(3));
  }

  #endregion
}
