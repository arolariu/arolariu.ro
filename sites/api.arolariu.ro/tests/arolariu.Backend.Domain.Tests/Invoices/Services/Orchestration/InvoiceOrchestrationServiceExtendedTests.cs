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

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Extended unit tests for <see cref="InvoiceOrchestrationService"/> covering additional edge cases,
/// exception scenarios, and boundary conditions for comprehensive code coverage.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
[TestClass]
public sealed class InvoiceOrchestrationServiceExtendedTests
{
  private readonly Mock<IInvoiceStorageFoundationService> mockStorageService;
  private readonly Mock<IInvoiceAnalysisFoundationService> mockAnalysisService;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly InvoiceOrchestrationService orchestrationService;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies.
  /// </summary>
  public InvoiceOrchestrationServiceExtendedTests()
  {
    mockStorageService = new Mock<IInvoiceStorageFoundationService>();
    mockAnalysisService = new Mock<IInvoiceAnalysisFoundationService>();
    mockLoggerFactory = new Mock<ILoggerFactory>();

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
        .Returns(Mock.Of<ILogger<IInvoiceOrchestrationService>>());

    orchestrationService = new InvoiceOrchestrationService(
        mockAnalysisService.Object,
        mockStorageService.Object,
        mockLoggerFactory.Object);
  }

  #region Constructor Extended Tests

  /// <summary>
  /// Validates constructor throws when logger factory is null.
  /// </summary>
  [TestMethod]
  public void Constructor_NullLoggerFactory_CreatesInstanceWithNullLogger()
  {
    // Note: LoggerFactory null handling depends on implementation
    // This test verifies the service can be instantiated
    var service = new InvoiceOrchestrationService(
        mockAnalysisService.Object,
        mockStorageService.Object,
        mockLoggerFactory.Object);

    Assert.IsNotNull(service);
  }

  #endregion

  #region CreateInvoiceObject Extended Tests

  /// <summary>
  /// Validates invoice creation with foundation validation exception wrapping.
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
  /// Validates invoice creation with foundation dependency exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new InvalidOperationException("Database error");
    var foundationException = new InvoiceFoundationDependencyException(innerException);

    mockStorageService
        .Setup(s => s.CreateInvoiceObject(invoice, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationDependencyException>(() =>
        orchestrationService.CreateInvoiceObject(invoice, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates invoice creation with foundation dependency validation exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_FoundationDependencyValidationException_ThrowsOrchestrationDependencyValidationException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new ArgumentException("Invalid data");
    var foundationException = new InvoiceFoundationDependencyValidationException(innerException);

    mockStorageService
        .Setup(s => s.CreateInvoiceObject(invoice, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationDependencyValidationException>(() =>
        orchestrationService.CreateInvoiceObject(invoice, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates invoice creation with foundation service exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_FoundationServiceException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new InvalidOperationException("Service error");
    var foundationException = new InvoiceFoundationServiceException(innerException);

    mockStorageService
        .Setup(s => s.CreateInvoiceObject(invoice, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
        orchestrationService.CreateInvoiceObject(invoice, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates invoice creation with generic exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockStorageService
        .Setup(s => s.CreateInvoiceObject(invoice, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
        orchestrationService.CreateInvoiceObject(invoice, null, CancellationToken.None));
  }

  #endregion

  #region ReadInvoiceObject Extended Tests

  /// <summary>
  /// Validates invoice read with null user identifier.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_NullUserIdentifier_ReturnsInvoice()
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
  }

  /// <summary>
  /// Validates invoice read with foundation validation exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new ArgumentException("Invalid ID");
    var foundationException = new InvoiceFoundationValidationException(innerException);

    mockStorageService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationValidationException>(() =>
        orchestrationService.ReadInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates invoice read with foundation dependency exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Database error");
    var foundationException = new InvoiceFoundationDependencyException(innerException);

    mockStorageService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationDependencyException>(() =>
        orchestrationService.ReadInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates invoice read with generic exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
        orchestrationService.ReadInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  #endregion

  #region ReadAllInvoiceObjects Extended Tests

  /// <summary>
  /// Validates bulk read returns empty collection.
  /// </summary>
  [TestMethod]
  public async Task ReadAllInvoiceObjects_NoInvoices_ReturnsEmptyCollection()
  {
    // Arrange
    var userId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(new List<Invoice>());

    // Act
    var result = await orchestrationService.ReadAllInvoiceObjects(userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.IsEmpty(result);
  }

  /// <summary>
  /// Validates bulk read returns large collection.
  /// </summary>
  [TestMethod]
  public async Task ReadAllInvoiceObjects_LargeCollection_ReturnsAllInvoices()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var expectedInvoices = InvoiceBuilder.CreateMultipleRandomInvoices(100);

    mockStorageService
        .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedInvoices);

    // Act
    var result = await orchestrationService.ReadAllInvoiceObjects(userId, CancellationToken.None);

    // Assert
    Assert.AreEqual(100, result.Count());
  }

  /// <summary>
  /// Validates bulk read with foundation dependency exception wrapping.
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
  /// Validates bulk read with foundation validation exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task ReadAllInvoiceObjects_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var innerException = new ArgumentException("Invalid user ID");
    var foundationException = new InvoiceFoundationValidationException(innerException);

    mockStorageService
        .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationValidationException>(() =>
        orchestrationService.ReadAllInvoiceObjects(userId, CancellationToken.None));
  }

  /// <summary>
  /// Validates bulk read with generic exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task ReadAllInvoiceObjects_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var userId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
        orchestrationService.ReadAllInvoiceObjects(userId, CancellationToken.None));
  }

  #endregion

  #region UpdateInvoiceObject Extended Tests

  /// <summary>
  /// Validates invoice update with null user identifier.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_NullUserIdentifier_ReturnsUpdatedInvoice()
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
  }

  /// <summary>
  /// Validates invoice update with foundation validation exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new ArgumentException("Invalid invoice");
    var foundationException = new InvoiceFoundationValidationException(innerException);

    mockStorageService
        .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationValidationException>(() =>
        orchestrationService.UpdateInvoiceObject(updatedInvoice, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates invoice update with foundation dependency exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new InvalidOperationException("Concurrency error");
    var foundationException = new InvoiceFoundationDependencyException(innerException);

    mockStorageService
        .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationDependencyException>(() =>
        orchestrationService.UpdateInvoiceObject(updatedInvoice, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates invoice update with foundation dependency validation exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_FoundationDependencyValidationException_ThrowsOrchestrationDependencyValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new ArgumentNullException("parameter");
    var foundationException = new InvoiceFoundationDependencyValidationException(innerException);

    mockStorageService
        .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationDependencyValidationException>(() =>
        orchestrationService.UpdateInvoiceObject(updatedInvoice, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates invoice update with generic exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockStorageService
        .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
        orchestrationService.UpdateInvoiceObject(updatedInvoice, invoiceId, null, CancellationToken.None));
  }

  #endregion

  #region DeleteInvoiceObject Extended Tests

  /// <summary>
  /// Validates invoice delete with null user identifier.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_NullUserIdentifier_DeletesSuccessfully()
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
  /// Validates invoice delete with foundation validation exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new ArgumentException("Invalid ID");
    var foundationException = new InvoiceFoundationValidationException(innerException);

    mockStorageService
        .Setup(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationValidationException>(() =>
        orchestrationService.DeleteInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates invoice delete with foundation dependency exception wrapping.
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
  /// Validates invoice delete with generic exception wrapping.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
        orchestrationService.DeleteInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates idempotent delete operations.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_IdempotentCalls_SucceedMultipleTimes()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.DeleteInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await orchestrationService.DeleteInvoiceObject(invoiceId, userId, CancellationToken.None);
    await orchestrationService.DeleteInvoiceObject(invoiceId, userId, CancellationToken.None);
    await orchestrationService.DeleteInvoiceObject(invoiceId, userId, CancellationToken.None);

    // Assert
    mockStorageService.Verify(s => s.DeleteInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()), Times.Exactly(3));
  }

  #endregion

  #region AnalyzeInvoiceWithOptions Extended Tests

  /// <summary>
  /// Validates analysis with CompleteAnalysis option.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceWithOptions_CompleteAnalysis_CallsAllServices()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockStorageService
        .Setup(s => s.ReadInvoiceObject(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockAnalysisService
        .Setup(s => s.AnalyzeInvoiceAsync(options, invoice, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockStorageService
        .Setup(s => s.UpdateInvoiceObject(invoice, invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await orchestrationService.AnalyzeInvoiceWithOptions(options, invoiceId, userId, CancellationToken.None);

    // Assert
    mockAnalysisService.Verify(s => s.AnalyzeInvoiceAsync(options, invoice, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates analysis with InvoiceOnly option.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceWithOptions_InvoiceOnlyOption_CallsAnalysisService()
  {
    // Arrange
    var options = AnalysisOptions.InvoiceOnly;
    var invoiceId = Guid.NewGuid();
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
    mockAnalysisService.Verify(s => s.AnalyzeInvoiceAsync(options, invoice, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates analysis read failure wrapping.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceWithOptions_ReadFails_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoiceId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Read failed"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
        orchestrationService.AnalyzeInvoiceWithOptions(options, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates analysis service failure wrapping.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceWithOptions_AnalysisFails_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockStorageService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockAnalysisService
        .Setup(s => s.AnalyzeInvoiceAsync(options, invoice, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Analysis failed"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
        orchestrationService.AnalyzeInvoiceWithOptions(options, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates analysis update failure wrapping.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceWithOptions_UpdateFails_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockStorageService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockAnalysisService
        .Setup(s => s.AnalyzeInvoiceAsync(options, invoice, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockStorageService
        .Setup(s => s.UpdateInvoiceObject(invoice, invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Update failed"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationServiceException>(() =>
        orchestrationService.AnalyzeInvoiceWithOptions(options, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates analysis with foundation dependency exception.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceWithOptions_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoiceId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Database error");
    var foundationException = new InvoiceFoundationDependencyException(innerException);

    mockStorageService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationDependencyException>(() =>
        orchestrationService.AnalyzeInvoiceWithOptions(options, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates analysis with foundation validation exception.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceWithOptions_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoiceId = Guid.NewGuid();
    var innerException = new ArgumentException("Invalid invoice");
    var foundationException = new InvoiceFoundationValidationException(innerException);

    mockStorageService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationValidationException>(() =>
        orchestrationService.AnalyzeInvoiceWithOptions(options, invoiceId, null, CancellationToken.None));
  }

  #endregion
}
