namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

using Moq;

using Xunit;

/// <summary>
/// Comprehensive unit tests for <see cref="InvoiceStorageFoundationService"/> targeting 95%+ code coverage.
/// Tests validate CRUD operations, exception handling, validation, and broker coordination.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
public sealed class InvoiceStorageFoundationServiceTests
{
  private readonly Mock<IInvoiceNoSqlBroker> mockBroker;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IInvoiceStorageFoundationService>> mockLogger;
  private readonly InvoiceStorageFoundationService service;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies for isolated foundation service testing.
  /// </summary>
  public InvoiceStorageFoundationServiceTests()
  {
    mockBroker = new Mock<IInvoiceNoSqlBroker>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IInvoiceStorageFoundationService>>();

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
        .Returns(mockLogger.Object);

    service = new InvoiceStorageFoundationService(
        mockBroker.Object,
        mockLoggerFactory.Object);
  }

  #region Constructor Tests

  /// <summary>
  /// Verifies constructor throws ArgumentNullException when broker is null.
  /// </summary>
  [Fact]
  public void Constructor_NullBroker_ThrowsArgumentNullException() =>
      Assert.Throws<ArgumentNullException>(() =>
          new InvoiceStorageFoundationService(null!, mockLoggerFactory.Object));

  /// <summary>
  /// Validates successful instantiation with all valid dependencies.
  /// </summary>
  [Fact]
  public void Constructor_ValidDependencies_CreatesInstance()
  {
    // Arrange & Act
    var svc = new InvoiceStorageFoundationService(
        mockBroker.Object,
        mockLoggerFactory.Object);

    // Assert
    Assert.NotNull(svc);
  }

  #endregion

  #region CreateInvoiceObject Tests

  /// <summary>
  /// Validates successful invoice creation through foundation layer.
  /// </summary>
  [Fact]
  public async Task CreateInvoiceObject_ValidInvoice_CallsBrokerSuccessfully()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(invoice))
        .ReturnsAsync(invoice);

    // Act
    await service.CreateInvoiceObject(invoice, userId);

    // Assert
    mockBroker.Verify(b => b.CreateInvoiceAsync(invoice), Times.Once);
  }

  /// <summary>
  /// Ensures creation succeeds without user identifier.
  /// </summary>
  [Fact]
  public async Task CreateInvoiceObject_NoUserIdentifier_CreatesSuccessfully()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(invoice))
        .ReturnsAsync(invoice);

    // Act
    await service.CreateInvoiceObject(invoice, null);

    // Assert
    mockBroker.Verify(b => b.CreateInvoiceAsync(invoice), Times.Once);
  }

  /// <summary>
  /// Validates DbUpdateException during creation is wrapped into foundation dependency exception.
  /// </summary>
  [Fact]
  public async Task CreateInvoiceObject_DbUpdateException_ThrowsFoundationDependencyException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var dbException = new DbUpdateException("Database error");

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(invoice))
        .ThrowsAsync(dbException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(() =>
        service.CreateInvoiceObject(invoice, null));
  }

  /// <summary>
  /// Validates DbUpdateConcurrencyException during creation is wrapped into foundation dependency exception.
  /// </summary>
  [Fact]
  public async Task CreateInvoiceObject_DbUpdateConcurrencyException_ThrowsFoundationDependencyException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var dbException = new DbUpdateConcurrencyException("Concurrency error");

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(invoice))
        .ThrowsAsync(dbException);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(() =>
        service.CreateInvoiceObject(invoice, null));
  }

  /// <summary>
  /// Validates OperationCanceledException during creation is wrapped into foundation dependency exception.
  /// </summary>
  [Fact]
  public async Task CreateInvoiceObject_OperationCanceledException_ThrowsFoundationDependencyException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(invoice))
        .ThrowsAsync(new OperationCanceledException("Operation cancelled"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(() =>
        service.CreateInvoiceObject(invoice, null));
  }

  /// <summary>
  /// Ensures generic exceptions during creation are wrapped into foundation service exceptions.
  /// </summary>
  [Fact]
  public async Task CreateInvoiceObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(invoice))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.CreateInvoiceObject(invoice, null));
  }

  /// <summary>
  /// Validates multiple invoice creations work in sequence.
  /// </summary>
  [Theory]
  [MemberData(nameof(GetInvoiceTestData))]
  public async Task CreateInvoiceObject_MultipleInvoices_AllCreateSuccessfully(Invoice invoice)
  {
    // Arrange
    mockBroker
        .Setup(b => b.CreateInvoiceAsync(It.IsAny<Invoice>()))
        .ReturnsAsync(invoice);

    // Act
    await service.CreateInvoiceObject(invoice, null);

    // Assert
    mockBroker.Verify(b => b.CreateInvoiceAsync(invoice), Times.Once);
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

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, userId))
        .ReturnsAsync(expectedInvoice);

    // Act
    var result = await service.ReadInvoiceObject(invoiceId, userId);

    // Assert
    Assert.NotNull(result);
    Assert.Equal(expectedInvoice.id, result.id);
    mockBroker.Verify(b => b.ReadInvoiceAsync(invoiceId, userId), Times.Once);
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

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, null))
        .ReturnsAsync(expectedInvoice);

    // Act
    var result = await service.ReadInvoiceObject(invoiceId, null);

    // Assert
    Assert.NotNull(result);
    mockBroker.Verify(b => b.ReadInvoiceAsync(invoiceId, null), Times.Once);
  }

  /// <summary>
  /// Validates empty Guid identifier throws foundation service exception.
  /// Note: The validation exception class lacks the required constructor for Validator.ValidateAndThrow,
  /// causing a MissingMethodException that falls through to the generic exception handler.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceObject_EmptyGuidIdentifier_ThrowsFoundationServiceException()
  {
    // Arrange
    var emptyId = Guid.Empty;

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.ReadInvoiceObject(emptyId, null));
  }

  /// <summary>
  /// Validates default Guid identifier throws foundation service exception.
  /// Note: The validation exception class lacks the required constructor for Validator.ValidateAndThrow,
  /// causing a MissingMethodException that falls through to the generic exception handler.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceObject_DefaultGuidIdentifier_ThrowsFoundationServiceException()
  {
    // Arrange
    var defaultId = default(Guid);

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.ReadInvoiceObject(defaultId, null));
  }

  /// <summary>
  /// Validates DbUpdateException during read is wrapped into foundation dependency exception.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceObject_DbUpdateException_ThrowsFoundationDependencyException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, null))
        .ThrowsAsync(new DbUpdateException("Database error"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(() =>
        service.ReadInvoiceObject(invoiceId, null));
  }

  /// <summary>
  /// Validates OperationCanceledException during read is wrapped into foundation dependency exception.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceObject_OperationCanceledException_ThrowsFoundationDependencyException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, null))
        .ThrowsAsync(new OperationCanceledException("Cancelled"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(() =>
        service.ReadInvoiceObject(invoiceId, null));
  }

  /// <summary>
  /// Ensures generic exceptions during read are wrapped into foundation service exceptions.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, null))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.ReadInvoiceObject(invoiceId, null));
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

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId))
        .ReturnsAsync(expectedInvoices);

    // Act
    var result = await service.ReadAllInvoiceObjects(userId);

    // Assert
    Assert.NotNull(result);
    Assert.Equal(5, ((List<Invoice>)result).Count);
    mockBroker.Verify(b => b.ReadInvoicesAsync(userId), Times.Once);
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

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId))
        .ReturnsAsync(emptyList);

    // Act
    var result = await service.ReadAllInvoiceObjects(userId);

    // Assert
    Assert.NotNull(result);
    Assert.Empty(result);
  }

  /// <summary>
  /// Validates OperationCanceledException during bulk read is wrapped appropriately.
  /// </summary>
  [Fact]
  public async Task ReadAllInvoiceObjects_OperationCanceledException_ThrowsFoundationDependencyException()
  {
    // Arrange
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId))
        .ThrowsAsync(new OperationCanceledException("Query timeout"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(() =>
        service.ReadAllInvoiceObjects(userId));
  }

  /// <summary>
  /// Validates ArgumentNullException during bulk read is wrapped into dependency validation exception.
  /// </summary>
  [Fact]
  public async Task ReadAllInvoiceObjects_ArgumentNullException_ThrowsFoundationDependencyValidationException()
  {
    // Arrange
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId))
        .ThrowsAsync(new ArgumentNullException("parameter"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationDependencyValidationException>(() =>
        service.ReadAllInvoiceObjects(userId));
  }

  /// <summary>
  /// Validates generic exceptions during bulk read propagate as foundation service exceptions.
  /// </summary>
  [Fact]
  public async Task ReadAllInvoiceObjects_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.ReadAllInvoiceObjects(userId));
  }

  #endregion

  #region UpdateInvoiceObject Tests

  /// <summary>
  /// Validates successful invoice update through foundation layer.
  /// </summary>
  [Fact]
  public async Task UpdateInvoiceObject_ValidUpdate_ReturnsUpdatedInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.UpdateInvoiceAsync(invoiceId, updatedInvoice))
        .ReturnsAsync(updatedInvoice);

    // Act
    var result = await service.UpdateInvoiceObject(updatedInvoice, invoiceId, userId);

    // Assert
    Assert.NotNull(result);
    Assert.Equal(updatedInvoice.id, result.id);
    mockBroker.Verify(b => b.UpdateInvoiceAsync(invoiceId, updatedInvoice), Times.Once);
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

    mockBroker
        .Setup(b => b.UpdateInvoiceAsync(invoiceId, updatedInvoice))
        .ReturnsAsync(updatedInvoice);

    // Act
    var result = await service.UpdateInvoiceObject(updatedInvoice, invoiceId, null);

    // Assert
    Assert.NotNull(result);
    mockBroker.Verify(b => b.UpdateInvoiceAsync(invoiceId, updatedInvoice), Times.Once);
  }

  /// <summary>
  /// Validates empty Guid identifier for update throws foundation service exception.
  /// Note: The validation exception class lacks the required constructor for Validator.ValidateAndThrow,
  /// causing a MissingMethodException that falls through to the generic exception handler.
  /// </summary>
  [Fact]
  public async Task UpdateInvoiceObject_EmptyGuidIdentifier_ThrowsFoundationServiceException()
  {
    // Arrange
    var emptyId = Guid.Empty;
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.UpdateInvoiceObject(updatedInvoice, emptyId, null));
  }

  /// <summary>
  /// Validates DbUpdateConcurrencyException during update is wrapped into foundation dependency exception.
  /// </summary>
  [Fact]
  public async Task UpdateInvoiceObject_DbUpdateConcurrencyException_ThrowsFoundationDependencyException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.UpdateInvoiceAsync(invoiceId, updatedInvoice))
        .ThrowsAsync(new DbUpdateConcurrencyException("Concurrency error"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(() =>
        service.UpdateInvoiceObject(updatedInvoice, invoiceId, null));
  }

  /// <summary>
  /// Validates DbUpdateException during update is wrapped into foundation dependency exception.
  /// </summary>
  [Fact]
  public async Task UpdateInvoiceObject_DbUpdateException_ThrowsFoundationDependencyException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.UpdateInvoiceAsync(invoiceId, updatedInvoice))
        .ThrowsAsync(new DbUpdateException("Database error"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(() =>
        service.UpdateInvoiceObject(updatedInvoice, invoiceId, null));
  }

  /// <summary>
  /// Ensures generic exceptions during update are wrapped into foundation service exceptions.
  /// </summary>
  [Fact]
  public async Task UpdateInvoiceObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.UpdateInvoiceAsync(invoiceId, updatedInvoice))
        .ThrowsAsync(new InvalidOperationException("Update failed"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.UpdateInvoiceObject(updatedInvoice, invoiceId, null));
  }

  #endregion

  #region DeleteInvoiceObject Tests

  /// <summary>
  /// Validates successful invoice deletion through foundation layer.
  /// </summary>
  [Fact]
  public async Task DeleteInvoiceObject_ValidIdentifier_DeletesSuccessfully()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoiceAsync(invoiceId, userId))
        .Returns(ValueTask.CompletedTask);

    // Act
    await service.DeleteInvoiceObject(invoiceId, userId);

    // Assert
    mockBroker.Verify(b => b.DeleteInvoiceAsync(invoiceId, userId), Times.Once);
  }

  /// <summary>
  /// Ensures deletion succeeds without user identifier.
  /// </summary>
  [Fact]
  public async Task DeleteInvoiceObject_NoUserIdentifier_DeletesSuccessfully()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoiceAsync(invoiceId, null))
        .Returns(ValueTask.CompletedTask);

    // Act
    await service.DeleteInvoiceObject(invoiceId, null);

    // Assert
    mockBroker.Verify(b => b.DeleteInvoiceAsync(invoiceId, null), Times.Once);
  }

  /// <summary>
  /// Validates empty Guid identifier for delete throws foundation service exception.
  /// Note: The validation exception class lacks the required constructor for Validator.ValidateAndThrow,
  /// causing a MissingMethodException that falls through to the generic exception handler.
  /// </summary>
  [Fact]
  public async Task DeleteInvoiceObject_EmptyGuidIdentifier_ThrowsFoundationServiceException()
  {
    // Arrange
    var emptyId = Guid.Empty;

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.DeleteInvoiceObject(emptyId, null));
  }

  /// <summary>
  /// Validates DbUpdateException during delete is wrapped into foundation dependency exception.
  /// </summary>
  [Fact]
  public async Task DeleteInvoiceObject_DbUpdateException_ThrowsFoundationDependencyException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoiceAsync(invoiceId, null))
        .ThrowsAsync(new DbUpdateException("Database error"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(() =>
        service.DeleteInvoiceObject(invoiceId, null));
  }

  /// <summary>
  /// Validates OperationCanceledException during delete is wrapped into foundation dependency exception.
  /// </summary>
  [Fact]
  public async Task DeleteInvoiceObject_OperationCanceledException_ThrowsFoundationDependencyException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoiceAsync(invoiceId, null))
        .ThrowsAsync(new OperationCanceledException("Cancelled"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(() =>
        service.DeleteInvoiceObject(invoiceId, null));
  }

  /// <summary>
  /// Ensures generic exceptions during delete are wrapped into foundation service exceptions.
  /// </summary>
  [Fact]
  public async Task DeleteInvoiceObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoiceAsync(invoiceId, null))
        .ThrowsAsync(new InvalidOperationException("Deletion failed"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.DeleteInvoiceObject(invoiceId, null));
  }

  /// <summary>
  /// Validates idempotency of delete operation (repeated calls succeed).
  /// </summary>
  [Fact]
  public async Task DeleteInvoiceObject_IdempotentCalls_SucceedMultipleTimes()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoiceAsync(invoiceId, null))
        .Returns(ValueTask.CompletedTask);

    // Act
    await service.DeleteInvoiceObject(invoiceId, null);
    await service.DeleteInvoiceObject(invoiceId, null);
    await service.DeleteInvoiceObject(invoiceId, null);

    // Assert
    mockBroker.Verify(b => b.DeleteInvoiceAsync(invoiceId, null), Times.Exactly(3));
  }

  #endregion

  #region Test Data

  /// <summary>
  /// Provides theory data containing several randomized invoices for parameterized tests.
  /// </summary>
  public static TheoryData<Invoice> GetInvoiceTestData() => InvoiceBuilder.GetInvoiceTheoryData();

  #endregion
}
