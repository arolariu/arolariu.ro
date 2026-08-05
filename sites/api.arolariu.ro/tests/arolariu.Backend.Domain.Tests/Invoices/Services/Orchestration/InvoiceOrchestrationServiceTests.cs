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
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Extensions.Logging;

using Moq;

using Xunit;

/// <summary>
/// Comprehensive unit tests for <see cref="InvoiceOrchestrationService"/> targeting 99% code coverage.
/// Tests validate orchestration logic, exception handling, telemetry integration and foundation service coordination.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
public sealed class InvoiceOrchestrationServiceTests
{
  private readonly Mock<IInvoiceAnalysisFoundationService> mockAnalysisService;
  private readonly Mock<IInvoiceStorageFoundationService> mockStorageService;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IInvoiceOrchestrationService>> mockLogger;
  private readonly InvoiceOrchestrationService orchestrationService;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies for isolated orchestration service testing.
  /// </summary>
  public InvoiceOrchestrationServiceTests()
  {
    mockAnalysisService = new Mock<IInvoiceAnalysisFoundationService>();
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
      mockAnalysisService.Object,
      mockStorageService.Object,
      mockLoggerFactory.Object);
  }

  #region Constructor Tests

  /// <summary>
  /// Verifies constructor throws ArgumentNullException when analysis service is null.
  /// </summary>
  [Fact]
  public void Constructor_NullAnalysisService_ThrowsArgumentNullException() =>
    // Arrange & Act & Assert
    Assert.Throws<ArgumentNullException>(() =>
      new InvoiceOrchestrationService(null!, mockStorageService.Object, mockLoggerFactory.Object));

  /// <summary>
  /// Verifies constructor throws ArgumentNullException when storage service is null.
  /// </summary>
  [Fact]
  public void Constructor_NullStorageService_ThrowsArgumentNullException() =>
    // Arrange & Act & Assert
    Assert.Throws<ArgumentNullException>(() =>
      new InvoiceOrchestrationService(mockAnalysisService.Object, null!, mockLoggerFactory.Object));

  /// <summary>
  /// Validates successful instantiation with all valid dependencies.
  /// </summary>
  [Fact]
  public void Constructor_ValidDependencies_CreatesInstance()
  {
    // Arrange & Act
    var service = new InvoiceOrchestrationService(
      mockAnalysisService.Object,
      mockStorageService.Object,
      mockLoggerFactory.Object);

    // Assert
    Assert.NotNull(service);
  }

  #endregion

  #region AnalyzeInvoiceWithOptions Tests

  /// <summary>
  /// Ensures successful invoice analysis orchestration with complete workflow execution.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceWithOptions_ValidInput_ExecutesCompleteWorkflow()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var options = AnalysisOptions.CompleteAnalysis;
    var originalInvoice = InvoiceBuilder.CreateRandomInvoice();
    var analyzedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockStorageService
      .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
      .ReturnsAsync(originalInvoice);

    mockAnalysisService
      .Setup(s => s.AnalyzeInvoiceAsync(options, originalInvoice, It.IsAny<CancellationToken>()))
      .ReturnsAsync(analyzedInvoice);

    mockStorageService
      .Setup(s => s.UpdateInvoiceObject(analyzedInvoice, invoiceId, userId, It.IsAny<CancellationToken>()))
      .ReturnsAsync(analyzedInvoice);

    // Act
    await orchestrationService.AnalyzeInvoiceWithOptions(options, invoiceId, userId, CancellationToken.None);

    // Assert
    mockStorageService.Verify(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
    mockAnalysisService.Verify(s => s.AnalyzeInvoiceAsync(options, originalInvoice, It.IsAny<CancellationToken>()), Times.Once);
    mockStorageService.Verify(s => s.UpdateInvoiceObject(analyzedInvoice, invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates analysis workflow execution without user identifier (partition-less operation).
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceWithOptions_NoUserIdentifier_ExecutesWorkflow()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var options = AnalysisOptions.InvoiceOnly;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockStorageService
      .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
  .ReturnsAsync(invoice);

    mockAnalysisService
.Setup(s => s.AnalyzeInvoiceAsync(options, invoice, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    mockStorageService
      .Setup(s => s.UpdateInvoiceObject(invoice, invoiceId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    // Act
    await orchestrationService.AnalyzeInvoiceWithOptions(options, invoiceId, null, CancellationToken.None);

    // Assert
    mockStorageService.Verify(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Confirms that foundation validation exceptions are surfaced as orchestration validation exceptions (no collapse).
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceWithOptions_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Validation failed");
    var foundationException = new InvoiceFoundationValidationException(innerException);

    mockStorageService
      .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
   .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceOrchestrationValidationException>(() =>
      orchestrationService.AnalyzeInvoiceWithOptions(AnalysisOptions.NoAnalysis, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates foundation dependency exceptions are wrapped into orchestration dependency exceptions.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceWithOptions_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Database connection failed");
    var foundationException = new InvoiceFoundationDependencyException(innerException);

    mockStorageService
      .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceOrchestrationDependencyException>(() =>
      orchestrationService.AnalyzeInvoiceWithOptions(AnalysisOptions.CompleteAnalysis, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Ensures foundation dependency validation exceptions propagate as orchestration dependency validation exceptions.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceWithOptions_FoundationDependencyValidationException_ThrowsOrchestrationDependencyValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new ArgumentNullException("parameter");
    var foundationException = new InvoiceFoundationDependencyValidationException(innerException);

    mockStorageService
      .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceOrchestrationDependencyValidationException>(() =>
      orchestrationService.AnalyzeInvoiceWithOptions(AnalysisOptions.InvoiceItemsOnly, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Verifies foundation service exceptions are wrapped into orchestration service exceptions.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceWithOptions_FoundationServiceException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Internal service error");
    var foundationException = new InvoiceFoundationServiceException(innerException);

    mockStorageService
   .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
 .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceOrchestrationServiceException>(() =>
  orchestrationService.AnalyzeInvoiceWithOptions(AnalysisOptions.InvoiceMerchantOnly, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Confirms generic exceptions are wrapped into orchestration service exceptions.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceWithOptions_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var exception = new InvalidOperationException("Unexpected error");

    mockStorageService
   .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ThrowsAsync(exception);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceOrchestrationServiceException>(() =>
        orchestrationService.AnalyzeInvoiceWithOptions(AnalysisOptions.CompleteAnalysis, invoiceId, null, CancellationToken.None));
  }

  #endregion

  #region CreateInvoiceObject Tests

  /// <summary>
  /// Validates successful invoice creation through orchestration layer.
  /// </summary>
  [Fact]
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
    Assert.NotNull(result);
    Assert.Equal(invoice.id, result.id);
    mockStorageService.Verify(s => s.CreateInvoiceObject(invoice, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Ensures creation succeeds without user identifier.
  /// </summary>
  [Fact]
  public async Task CreateInvoiceObject_NoUserIdentifier_CreatesSuccessfully()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockStorageService
         .Setup(s => s.CreateInvoiceObject(invoice, null, It.IsAny<CancellationToken>()));

    // Act
    var result = await orchestrationService.CreateInvoiceObject(invoice, null, CancellationToken.None);

    // Assert
    Assert.NotNull(result);
    mockStorageService.Verify(s => s.CreateInvoiceObject(invoice, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Confirms foundation validation exceptions propagate as orchestration dependency validation exceptions during creation.
  /// </summary>
  [Fact]
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
    await Assert.ThrowsAsync<InvoiceOrchestrationValidationException>(() =>
      orchestrationService.CreateInvoiceObject(invoice, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates foundation dependency exceptions during creation are wrapped appropriately.
  /// </summary>
  [Fact]
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
    await Assert.ThrowsAsync<InvoiceOrchestrationDependencyException>(() =>
      orchestrationService.CreateInvoiceObject(invoice, null, CancellationToken.None));
  }

  /// <summary>
  /// Ensures generic exceptions during creation are wrapped into orchestration service exceptions.
  /// </summary>
  [Fact]
  public async Task CreateInvoiceObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var exception = new InvalidOperationException("Unexpected failure");

    mockStorageService
      .Setup(s => s.CreateInvoiceObject(invoice, null, It.IsAny<CancellationToken>()))
  .ThrowsAsync(exception);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceOrchestrationServiceException>(() =>
      orchestrationService.CreateInvoiceObject(invoice, null, CancellationToken.None));
  }

  #endregion

  #region ReadInvoiceObject Tests

  /// <summary>
  /// Validates successful retrieval of single invoice by identifier.
  /// </summary>
  [Fact]
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
    Assert.NotNull(result);
    Assert.Equal(expectedInvoice.id, result.id);
    mockStorageService.Verify(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Ensures read operation succeeds without user identifier.
  /// </summary>
  [Fact]
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
    Assert.NotNull(result);
    mockStorageService.Verify(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Confirms foundation validation exceptions during read are wrapped appropriately.
  /// </summary>
  [Fact]
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
    await Assert.ThrowsAsync<InvoiceOrchestrationValidationException>(() =>
      orchestrationService.ReadInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates foundation service exceptions during read propagate correctly.
  /// </summary>
  [Fact]
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
    await Assert.ThrowsAsync<InvoiceOrchestrationServiceException>(() =>
      orchestrationService.ReadInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  #endregion

  #region ReadAllInvoiceObjects Tests

  /// <summary>
  /// Validates successful retrieval of all invoices for a user.
  /// </summary>
  [Fact]
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
    Assert.NotNull(result);
    Assert.Equal(5, result.Count());
    mockStorageService.Verify(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates empty collection is returned when no invoices exist.
  /// </summary>
  [Fact]
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
    Assert.NotNull(result);
    Assert.Empty(result);
  }

  /// <summary>
  /// Confirms foundation dependency exceptions during bulk read are wrapped appropriately.
  /// </summary>
  [Fact]
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
    await Assert.ThrowsAsync<InvoiceOrchestrationDependencyException>(() =>
      orchestrationService.ReadAllInvoiceObjects(userId, CancellationToken.None));
  }

  /// <summary>
  /// Validates generic exceptions during bulk read propagate as orchestration service exceptions.
  /// </summary>
  [Fact]
  public async Task ReadAllInvoiceObjects_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var exception = new InvalidOperationException("Unexpected error");

    mockStorageService
      .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
      .ThrowsAsync(exception);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceOrchestrationServiceException>(() =>
      orchestrationService.ReadAllInvoiceObjects(userId, CancellationToken.None));
  }

  #endregion

  #region UpdateInvoiceObject Tests

  /// <summary>
  /// Validates successful invoice update through orchestration layer.
  /// </summary>
  [Fact]
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
    Assert.NotNull(result);
    Assert.Equal(updatedInvoice.id, result.id);
    mockStorageService.Verify(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Ensures update succeeds without user identifier.
  /// </summary>
  [Fact]
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
    Assert.NotNull(result);
    mockStorageService.Verify(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Confirms foundation validation exceptions during update are wrapped appropriately.
  /// </summary>
  [Fact]
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
    await Assert.ThrowsAsync<InvoiceOrchestrationValidationException>(() =>
      orchestrationService.UpdateInvoiceObject(updatedInvoice, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates foundation dependency validation exceptions during update propagate correctly.
  /// </summary>
  [Fact]
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
    await Assert.ThrowsAsync<InvoiceOrchestrationDependencyValidationException>(() =>
      orchestrationService.UpdateInvoiceObject(updatedInvoice, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Ensures generic exceptions during update are wrapped into orchestration service exceptions.
  /// </summary>
  [Fact]
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
    await Assert.ThrowsAsync<InvoiceOrchestrationServiceException>(() =>
      orchestrationService.UpdateInvoiceObject(updatedInvoice, invoiceId, null, CancellationToken.None));
  }

  #endregion

  #region DeleteInvoiceObject Tests

  /// <summary>
  /// Validates successful invoice deletion through orchestration layer.
  /// </summary>
  [Fact]
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
  [Fact]
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
  [Fact]
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
    await Assert.ThrowsAsync<InvoiceOrchestrationValidationException>(() =>
      orchestrationService.DeleteInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates foundation dependency exceptions during delete propagate correctly.
  /// </summary>
  [Fact]
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
    await Assert.ThrowsAsync<InvoiceOrchestrationDependencyException>(() =>
      orchestrationService.DeleteInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Ensures foundation service exceptions during delete are wrapped appropriately.
  /// </summary>
  [Fact]
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
    await Assert.ThrowsAsync<InvoiceOrchestrationServiceException>(() =>
      orchestrationService.DeleteInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates generic exceptions during delete are wrapped into orchestration service exceptions.
  /// </summary>
  [Fact]
  public async Task DeleteInvoiceObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var exception = new InvalidOperationException("Deletion failed");

    mockStorageService
      .Setup(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
      .ThrowsAsync(exception);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceOrchestrationServiceException>(() =>
      orchestrationService.DeleteInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates idempotency of delete operation (repeated calls succeed).
  /// </summary>
  [Fact]
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
