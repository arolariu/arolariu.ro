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

using Xunit;

/// <summary>
/// Extended unit tests for <see cref="InvoiceProcessingService"/> covering additional edge cases,
/// exception scenarios, and boundary conditions for comprehensive code coverage.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
public sealed class InvoiceProcessingServiceExtendedTests
{
  private readonly Mock<IInvoiceOrchestrationService> mockInvoiceOrchestrationService;
  private readonly Mock<IMerchantOrchestrationService> mockMerchantOrchestrationService;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly InvoiceProcessingService processingService;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies.
  /// </summary>
  public InvoiceProcessingServiceExtendedTests()
  {
    mockInvoiceOrchestrationService = new Mock<IInvoiceOrchestrationService>();
    mockMerchantOrchestrationService = new Mock<IMerchantOrchestrationService>();
    mockLoggerFactory = new Mock<ILoggerFactory>();

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
        .Returns(Mock.Of<ILogger<IInvoiceProcessingService>>());

    processingService = new InvoiceProcessingService(
        mockInvoiceOrchestrationService.Object,
        mockMerchantOrchestrationService.Object,
        mockLoggerFactory.Object);
  }

  #region AnalyzeInvoice Extended Tests

  /// <summary>
  /// Validates analysis with InvoiceOnly option.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoice_InvoiceOnlyOption_CallsOrchestrationService()
  {
    // Arrange
    var options = AnalysisOptions.InvoiceOnly;
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, userId, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await processingService.AnalyzeInvoice(options, invoiceId, userId);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates analysis with NoAnalysis option.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoice_NoAnalysisOption_CallsOrchestrationService()
  {
    // Arrange
    var options = AnalysisOptions.NoAnalysis;
    var invoiceId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, null, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await processingService.AnalyzeInvoice(options, invoiceId, null);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates analysis with InvoiceItemsOnly option.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoice_InvoiceItemsOnlyOption_CallsOrchestrationService()
  {
    // Arrange
    var options = AnalysisOptions.InvoiceItemsOnly;
    var invoiceId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, null, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await processingService.AnalyzeInvoice(options, invoiceId, null);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates analysis with InvoiceMerchantOnly option.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoice_InvoiceMerchantOnlyOption_CallsOrchestrationService()
  {
    // Arrange
    var options = AnalysisOptions.InvoiceMerchantOnly;
    var invoiceId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, null, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await processingService.AnalyzeInvoice(options, invoiceId, null);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates orchestration validation exception wrapping during analysis.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoice_OrchestrationValidationException_ThrowsProcessingValidationException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoiceId = Guid.NewGuid();
    var innerException = new ArgumentException("Invalid invoice");
    var orchException = new InvoiceOrchestrationValidationException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceValidationException>(() =>
        processingService.AnalyzeInvoice(options, invoiceId, null));
  }

  /// <summary>
  /// Validates orchestration dependency validation exception wrapping during analysis.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoice_OrchestrationDependencyValidationException_ThrowsProcessingDependencyValidationException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoiceId = Guid.NewGuid();
    var innerException = new ArgumentNullException("parameter");
    var orchException = new InvoiceOrchestrationDependencyValidationException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyValidationException>(() =>
        processingService.AnalyzeInvoice(options, invoiceId, null));
  }

  /// <summary>
  /// Validates orchestration service exception wrapping during analysis.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoice_OrchestrationServiceException_ThrowsProcessingServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoiceId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Service failure");
    var orchException = new InvoiceOrchestrationServiceException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.AnalyzeInvoice(options, invoiceId, null));
  }

  #endregion

  #region CreateInvoice Extended Tests

  /// <summary>
  /// Validates invoice creation with null user identifier.
  /// </summary>
  [Fact]
  public async Task CreateInvoice_NullUserIdentifier_CallsOrchestrationService()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.CreateInvoiceObject(invoice, It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await processingService.CreateInvoice(invoice, null);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.CreateInvoiceObject(invoice, It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates orchestration validation exception wrapping during creation.
  /// </summary>
  [Fact]
  public async Task CreateInvoice_OrchestrationValidationException_ThrowsProcessingValidationException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new ArgumentException("Invalid invoice data");
    var orchException = new InvoiceOrchestrationValidationException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.CreateInvoiceObject(invoice, It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceValidationException>(() =>
        processingService.CreateInvoice(invoice, null));
  }

  /// <summary>
  /// Validates orchestration dependency exception wrapping during creation.
  /// </summary>
  [Fact]
  public async Task CreateInvoice_OrchestrationDependencyException_ThrowsProcessingDependencyException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new InvalidOperationException("Database error");
    var orchException = new InvoiceOrchestrationDependencyException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.CreateInvoiceObject(invoice, It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyException>(() =>
        processingService.CreateInvoice(invoice, null));
  }

  #endregion

  #region ReadInvoice Extended Tests

  /// <summary>
  /// Validates invoice retrieval with null user identifier.
  /// </summary>
  [Fact]
  public async Task ReadInvoice_NullUserIdentifier_ReturnsInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var expectedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedInvoice);

    // Act
    var result = await processingService.ReadInvoice(invoiceId, null);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates orchestration dependency exception wrapping during read.
  /// </summary>
  [Fact]
  public async Task ReadInvoice_OrchestrationDependencyException_ThrowsProcessingDependencyException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Database error");
    var orchException = new InvoiceOrchestrationDependencyException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyException>(() =>
        processingService.ReadInvoice(invoiceId, null));
  }

  /// <summary>
  /// Validates orchestration service exception wrapping during read.
  /// </summary>
  [Fact]
  public async Task ReadInvoice_OrchestrationServiceException_ThrowsProcessingServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Service failure");
    var orchException = new InvoiceOrchestrationServiceException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.ReadInvoice(invoiceId, null));
  }

  /// <summary>
  /// Validates generic exception wrapping during read.
  /// </summary>
  [Fact]
  public async Task ReadInvoice_GenericException_ThrowsProcessingServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.ReadInvoice(invoiceId, null));
  }

  #endregion

  #region ReadInvoices Extended Tests

  /// <summary>
  /// Validates orchestration dependency exception wrapping during bulk read.
  /// </summary>
  [Fact]
  public async Task ReadInvoices_OrchestrationDependencyException_ThrowsProcessingDependencyException()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Database timeout");
    var orchException = new InvoiceOrchestrationDependencyException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyException>(() =>
        processingService.ReadInvoices(userId));
  }

  /// <summary>
  /// Validates orchestration service exception wrapping during bulk read.
  /// </summary>
  [Fact]
  public async Task ReadInvoices_OrchestrationServiceException_ThrowsProcessingServiceException()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Service failure");
    var orchException = new InvoiceOrchestrationServiceException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.ReadInvoices(userId));
  }

  /// <summary>
  /// Validates large collection handling during bulk read.
  /// </summary>
  [Fact]
  public async Task ReadInvoices_LargeCollection_ReturnsAllInvoices()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var expectedInvoices = InvoiceBuilder.CreateMultipleRandomInvoices(100);

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedInvoices);

    // Act
    var result = await processingService.ReadInvoices(userId);

    // Assert
    Assert.Equal(100, result.Count());
  }

  #endregion

  #region UpdateInvoice Extended Tests

  /// <summary>
  /// Validates update with null user identifier.
  /// </summary>
  [Fact]
  public async Task UpdateInvoice_NullUserIdentifier_ReturnsUpdatedInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(updatedInvoice);

    // Act
    var result = await processingService.UpdateInvoice(updatedInvoice, invoiceId, null);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates orchestration validation exception wrapping during update.
  /// </summary>
  [Fact]
  public async Task UpdateInvoice_OrchestrationValidationException_ThrowsProcessingValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new ArgumentException("Invalid data");
    var orchException = new InvoiceOrchestrationValidationException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceValidationException>(() =>
        processingService.UpdateInvoice(updatedInvoice, invoiceId, null));
  }

  /// <summary>
  /// Validates orchestration dependency exception wrapping during update.
  /// </summary>
  [Fact]
  public async Task UpdateInvoice_OrchestrationDependencyException_ThrowsProcessingDependencyException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();
    var innerException = new InvalidOperationException("Concurrency error");
    var orchException = new InvoiceOrchestrationDependencyException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyException>(() =>
        processingService.UpdateInvoice(updatedInvoice, invoiceId, null));
  }

  /// <summary>
  /// Validates generic exception wrapping during update.
  /// </summary>
  [Fact]
  public async Task UpdateInvoice_GenericException_ThrowsProcessingServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(updatedInvoice, invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.UpdateInvoice(updatedInvoice, invoiceId, null));
  }

  #endregion

  #region DeleteInvoice Extended Tests

  /// <summary>
  /// Validates delete with null user identifier.
  /// </summary>
  [Fact]
  public async Task DeleteInvoice_NullUserIdentifier_DeletesSuccessfully()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await processingService.DeleteInvoice(invoiceId, null);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates orchestration validation exception wrapping during delete.
  /// </summary>
  [Fact]
  public async Task DeleteInvoice_OrchestrationValidationException_ThrowsProcessingValidationException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new ArgumentException("Invalid invoice ID");
    var orchException = new InvoiceOrchestrationValidationException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceValidationException>(() =>
        processingService.DeleteInvoice(invoiceId, null));
  }

  /// <summary>
  /// Validates orchestration dependency exception wrapping during delete.
  /// </summary>
  [Fact]
  public async Task DeleteInvoice_OrchestrationDependencyException_ThrowsProcessingDependencyException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Database constraint violation");
    var orchException = new InvoiceOrchestrationDependencyException(innerException);

    mockInvoiceOrchestrationService
        .Setup(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyException>(() =>
        processingService.DeleteInvoice(invoiceId, null));
  }

  /// <summary>
  /// Validates generic exception wrapping during delete.
  /// </summary>
  [Fact]
  public async Task DeleteInvoice_GenericException_ThrowsProcessingServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.DeleteInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.DeleteInvoice(invoiceId, null));
  }

  #endregion

  #region DeleteInvoices Extended Tests

  /// <summary>
  /// Validates orchestration exception during bulk delete read phase.
  /// </summary>
  [Fact]
  public async Task DeleteInvoices_ReadThrows_ThrowsProcessingServiceException()
  {
    // Arrange
    var userId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Read failed"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.DeleteInvoices(userId));
  }

  /// <summary>
  /// Validates orchestration exception during bulk delete loop.
  /// </summary>
  [Fact]
  public async Task DeleteInvoices_DeleteThrows_ThrowsProcessingServiceException()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var invoices = InvoiceBuilder.CreateMultipleRandomInvoices(3);

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoices);

    mockInvoiceOrchestrationService
        .Setup(s => s.DeleteInvoiceObject(It.IsAny<Guid>(), userId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Delete failed"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.DeleteInvoices(userId));
  }

  /// <summary>
  /// Validates bulk delete with large collection.
  /// </summary>
  [Fact]
  public async Task DeleteInvoices_LargeCollection_DeletesAll()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var invoices = InvoiceBuilder.CreateMultipleRandomInvoices(50);

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoices);

    mockInvoiceOrchestrationService
        .Setup(s => s.DeleteInvoiceObject(It.IsAny<Guid>(), userId, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await processingService.DeleteInvoices(userId);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.DeleteInvoiceObject(It.IsAny<Guid>(), userId, It.IsAny<CancellationToken>()), Times.Exactly(50));
  }

  #endregion

  #region AddProduct Extended Tests

  /// <summary>
  /// Validates product addition with null user identifier.
  /// </summary>
  [Fact]
  public async Task AddProduct_NullUserIdentifier_AddsProduct()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var product = new Product { Name = "Test", Price = 10m };

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await processingService.AddProduct(product, invoiceId, null);

    // Assert
    mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates exception during product addition read phase.
  /// </summary>
  [Fact]
  public async Task AddProduct_ReadThrows_ThrowsProcessingServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var product = new Product { Name = "Test", Price = 10m };

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Read failed"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.AddProduct(product, invoiceId, null));
  }

  /// <summary>
  /// Validates exception during product addition update phase.
  /// </summary>
  [Fact]
  public async Task AddProduct_UpdateThrows_ThrowsProcessingServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var product = new Product { Name = "Test", Price = 10m };

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    mockInvoiceOrchestrationService
        .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId))
        .ThrowsAsync(new InvalidOperationException("Update failed"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.AddProduct(product, invoiceId, userId));
  }

  #endregion

  #region GetProducts Extended Tests

  /// <summary>
  /// Validates products retrieval with null user identifier.
  /// </summary>
  [Fact]
  public async Task GetProducts_NullUserIdentifier_ReturnsProducts()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await processingService.GetProducts(invoiceId, null);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates exception during products retrieval.
  /// </summary>
  [Fact]
  public async Task GetProducts_OrchestrationThrows_ThrowsProcessingServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Read failed"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.GetProducts(invoiceId, null));
  }

  /// <summary>
  /// Validates empty products collection.
  /// </summary>
  [Fact]
  public async Task GetProducts_EmptyCollection_ReturnsEmptyEnumerable()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Items.Clear();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await processingService.GetProducts(invoiceId, null);

    // Assert
    Assert.Empty(result);
  }

  #endregion

  #region GetProduct Extended Tests

  /// <summary>
  /// Validates product search by partial name match.
  /// </summary>
  [Fact]
  public async Task GetProduct_PartialNameMatch_ReturnsProduct()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var productPartialName = invoice.Items.First().Name.Substring(0, 3);

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await processingService.GetProduct(productPartialName, invoiceId, null);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates product search by name.
  /// </summary>
  [Fact]
  public async Task GetProduct_NameMatch_ReturnsProduct()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var product = invoice.Items.First();
    product.Name = "TestProductName";

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await processingService.GetProduct("TestProductName", invoiceId, null);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates exception during product retrieval.
  /// </summary>
  [Fact]
  public async Task GetProduct_OrchestrationThrows_ThrowsProcessingServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockInvoiceOrchestrationService
        .Setup(s => s.ReadInvoiceObject(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Read failed"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.GetProduct("test", invoiceId, null));
  }

  #endregion

  #region Merchant Operations Extended Tests

  /// <summary>
  /// Validates merchant orchestration validation exception wrapping.
  /// Note: CreateMerchant uses generic TryCatch that wraps merchant exceptions as ServiceException.
  /// </summary>
  [Fact]
  public async Task CreateMerchant_OrchestrationValidationException_ThrowsProcessingServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var innerException = new ArgumentException("Invalid merchant");
    var orchException = new MerchantOrchestrationServiceValidationException(innerException);

    mockMerchantOrchestrationService
        .Setup(s => s.CreateMerchantObject(merchant, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.CreateMerchant(merchant, null));
  }

  /// <summary>
  /// Validates merchant orchestration dependency exception wrapping.
  /// Note: CreateMerchant uses generic TryCatch that wraps merchant exceptions as ServiceException.
  /// </summary>
  [Fact]
  public async Task CreateMerchant_OrchestrationDependencyException_ThrowsProcessingServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var innerException = new InvalidOperationException("Database error");
    var orchException = new MerchantOrchestrationServiceDependencyException(innerException);

    mockMerchantOrchestrationService
        .Setup(s => s.CreateMerchantObject(merchant, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.CreateMerchant(merchant, null));
  }

  /// <summary>
  /// Validates merchant read with valid parent company ID.
  /// </summary>
  [Fact]
  public async Task ReadMerchant_WithParentCompanyId_ReturnsMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockMerchantOrchestrationService
        .Setup(s => s.ReadMerchantObject(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await processingService.ReadMerchant(merchantId, parentCompanyId);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates merchant read without parent company ID.
  /// </summary>
  [Fact]
  public async Task ReadMerchant_NullParentCompanyId_ReturnsMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockMerchantOrchestrationService
        .Setup(s => s.ReadMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await processingService.ReadMerchant(merchantId, null);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates merchant read orchestration service exception wrapping.
  /// </summary>
  [Fact]
  public async Task ReadMerchant_OrchestrationServiceException_ThrowsProcessingServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Service failure");
    var orchException = new MerchantOrchestrationServiceException(innerException);

    mockMerchantOrchestrationService
        .Setup(s => s.ReadMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.ReadMerchant(merchantId, null));
  }

  /// <summary>
  /// Validates merchant update without parent company ID.
  /// </summary>
  [Fact]
  public async Task UpdateMerchant_NullParentCompanyId_ReturnsUpdatedMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockMerchantOrchestrationService
        .Setup(s => s.UpdateMerchantObject(updatedMerchant, merchantId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(updatedMerchant);

    // Act
    var result = await processingService.UpdateMerchant(updatedMerchant, merchantId, null);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates merchant update orchestration service exception wrapping.
  /// </summary>
  [Fact]
  public async Task UpdateMerchant_OrchestrationServiceException_ThrowsProcessingServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var innerException = new InvalidOperationException("Update failed");
    var orchException = new MerchantOrchestrationServiceException(innerException);

    mockMerchantOrchestrationService
        .Setup(s => s.UpdateMerchantObject(updatedMerchant, merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(orchException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
        processingService.UpdateMerchant(updatedMerchant, merchantId, null));
  }

  /// <summary>
  /// Validates merchant delete with parent company ID.
  /// </summary>
  [Fact]
  public async Task DeleteMerchant_WithParentCompanyId_DeletesSuccessfully()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockMerchantOrchestrationService
        .Setup(s => s.DeleteMerchantObject(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await processingService.DeleteMerchant(merchantId, parentCompanyId);

    // Assert
    mockMerchantOrchestrationService.Verify(s => s.DeleteMerchantObject(merchantId, parentCompanyId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates merchant delete without parent company ID.
  /// </summary>
  [Fact]
  public async Task DeleteMerchant_NullParentCompanyId_DeletesSuccessfully()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockMerchantOrchestrationService
        .Setup(s => s.DeleteMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await processingService.DeleteMerchant(merchantId, null);

    // Assert
    mockMerchantOrchestrationService.Verify(s => s.DeleteMerchantObject(merchantId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  #endregion
}
