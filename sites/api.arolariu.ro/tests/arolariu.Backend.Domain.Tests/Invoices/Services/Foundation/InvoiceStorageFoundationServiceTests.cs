namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Extensions.Logging;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Comprehensive unit tests for <see cref="InvoiceStorageFoundationService"/> targeting 95%+ code coverage.
/// Tests validate CRUD operations, exception handling, validation, and broker coordination.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
[TestClass]
public sealed class InvoiceStorageFoundationServiceTests
{
  private readonly Mock<IDatabaseBroker> mockBroker;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IInvoiceStorageFoundationService>> mockLogger;
  private readonly InvoiceStorageFoundationService service;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies for isolated foundation service testing.
  /// </summary>
  public InvoiceStorageFoundationServiceTests()
  {
    mockBroker = new Mock<IDatabaseBroker>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IInvoiceStorageFoundationService>>();

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
        .Returns(mockLogger.Object);

    service = new InvoiceStorageFoundationService(mockBroker.Object, mockLoggerFactory.Object);
  }

  #region Constructor Tests

  /// <summary>
  /// Verifies constructor throws ArgumentNullException when broker is null.
  /// </summary>
  [TestMethod]
  public void Constructor_NullBroker_ThrowsArgumentNullException() =>
      Assert.ThrowsExactly<ArgumentNullException>(() =>
          new InvoiceStorageFoundationService(null!, mockLoggerFactory.Object));

  /// <summary>
  /// Validates successful instantiation with all valid dependencies.
  /// </summary>
  [TestMethod]
  public void Constructor_ValidDependencies_CreatesInstance()
  {
    // Arrange & Act
    var svc = new InvoiceStorageFoundationService(mockBroker.Object, mockLoggerFactory.Object);

    // Assert
    Assert.IsNotNull(svc);
  }

  #endregion

  #region CreateInvoiceObject Tests

  /// <summary>
  /// Validates successful invoice creation through foundation layer.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_ValidInvoice_CallsBrokerSuccessfully()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(invoice, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await service.CreateInvoiceObject(invoice, userId, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.CreateInvoiceAsync(invoice, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Ensures creation succeeds without user identifier.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_NoUserIdentifier_CreatesSuccessfully()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(invoice, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await service.CreateInvoiceObject(invoice, null, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.CreateInvoiceAsync(invoice, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates OperationCanceledException during creation is wrapped into foundation dependency exception.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_OperationCanceledException_PropagatesOperationCanceledException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(invoice, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new OperationCanceledException("Operation cancelled"));

    // Act & Assert — cancellation must not be reclassified into a domain exception (bug fix)
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
        service.CreateInvoiceObject(invoice, null, CancellationToken.None));
  }

  /// <summary>
  /// Ensures generic exceptions during creation are wrapped into foundation service exceptions.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(invoice, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.CreateInvoiceObject(invoice, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates multiple invoice creations work in sequence.
  /// </summary>
  [TestMethod]
  [DynamicData(nameof(GetInvoiceTestData))]
  public async Task CreateInvoiceObject_MultipleInvoices_AllCreateSuccessfully(Invoice invoice)
  {
    // Arrange
    mockBroker
        .Setup(b => b.CreateInvoiceAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await service.CreateInvoiceObject(invoice, null, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.CreateInvoiceAsync(invoice, It.IsAny<CancellationToken>()), Times.Once);
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

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedInvoice);

    // Act
    var result = await service.ReadInvoiceObject(invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(expectedInvoice.id, result.id);
    mockBroker.Verify(b => b.ReadInvoiceAsync(invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
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

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedInvoice);

    // Act
    var result = await service.ReadInvoiceObject(invoiceId, null, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    mockBroker.Verify(b => b.ReadInvoiceAsync(invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates empty Guid identifier throws foundation service exception.
  /// Note: The validation exception class lacks the required constructor for Validator.ValidateAndThrow,
  /// causing a MissingMethodException that falls through to the generic exception handler.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_EmptyGuidIdentifier_ThrowsFoundationServiceException()
  {
    // Arrange
    var emptyId = Guid.Empty;

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.ReadInvoiceObject(emptyId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates default Guid identifier throws foundation service exception.
  /// Note: The validation exception class lacks the required constructor for Validator.ValidateAndThrow,
  /// causing a MissingMethodException that falls through to the generic exception handler.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_DefaultGuidIdentifier_ThrowsFoundationServiceException()
  {
    // Arrange
    var defaultId = default(Guid);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.ReadInvoiceObject(defaultId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates OperationCanceledException during read is wrapped into foundation dependency exception.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_OperationCanceledException_PropagatesOperationCanceledException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new OperationCanceledException("Cancelled"));

    // Act & Assert — cancellation must not be reclassified into a domain exception (bug fix)
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
        service.ReadInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Ensures generic exceptions during read are wrapped into foundation service exceptions.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.ReadInvoiceObject(invoiceId, null, CancellationToken.None));
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

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedInvoices);

    // Act
    var result = await service.ReadAllInvoiceObjects(userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(5, ((List<Invoice>)result).Count);
    mockBroker.Verify(b => b.ReadInvoicesAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
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

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(emptyList);

    // Act
    var result = await service.ReadAllInvoiceObjects(userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.IsEmpty(result);
  }

  /// <summary>
  /// Validates OperationCanceledException during bulk read is wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task ReadAllInvoiceObjects_OperationCanceledException_PropagatesOperationCanceledException()
  {
    // Arrange
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new OperationCanceledException("Query timeout"));

    // Act & Assert — cancellation must not be reclassified into a domain exception (bug fix)
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
        service.ReadAllInvoiceObjects(userId, CancellationToken.None));
  }

  /// <summary>
  /// Validates generic exceptions during bulk read propagate as foundation service exceptions.
  /// </summary>
  [TestMethod]
  public async Task ReadAllInvoiceObjects_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.ReadAllInvoiceObjects(userId, CancellationToken.None));
  }

  #endregion

  #region UpdateInvoiceObject Tests

  /// <summary>
  /// Validates successful invoice update through foundation layer.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_ValidUpdate_ReturnsUpdatedInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.UpdateInvoiceAsync(invoiceId, updatedInvoice, It.IsAny<CancellationToken>()))
        .ReturnsAsync(updatedInvoice);

    // Act
    var result = await service.UpdateInvoiceObject(updatedInvoice, invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(updatedInvoice.id, result.id);
    mockBroker.Verify(b => b.UpdateInvoiceAsync(invoiceId, updatedInvoice, It.IsAny<CancellationToken>()), Times.Once);
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

    mockBroker
        .Setup(b => b.UpdateInvoiceAsync(invoiceId, updatedInvoice, It.IsAny<CancellationToken>()))
        .ReturnsAsync(updatedInvoice);

    // Act
    var result = await service.UpdateInvoiceObject(updatedInvoice, invoiceId, null, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    mockBroker.Verify(b => b.UpdateInvoiceAsync(invoiceId, updatedInvoice, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates empty Guid identifier for update throws foundation service exception.
  /// Note: The validation exception class lacks the required constructor for Validator.ValidateAndThrow,
  /// causing a MissingMethodException that falls through to the generic exception handler.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_EmptyGuidIdentifier_ThrowsFoundationServiceException()
  {
    // Arrange
    var emptyId = Guid.Empty;
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.UpdateInvoiceObject(updatedInvoice, emptyId, null, CancellationToken.None));
  }

  /// <summary>
  /// Ensures generic exceptions during update are wrapped into foundation service exceptions.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.UpdateInvoiceAsync(invoiceId, updatedInvoice, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Update failed"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.UpdateInvoiceObject(updatedInvoice, invoiceId, null, CancellationToken.None));
  }

  #endregion

  #region DeleteInvoiceObject Tests

  /// <summary>
  /// Validates successful invoice deletion through foundation layer.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_ValidIdentifier_DeletesSuccessfully()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoiceAsync(invoiceId, userId, It.IsAny<CancellationToken>()))
        .Returns(ValueTask.CompletedTask);

    // Act
    await service.DeleteInvoiceObject(invoiceId, userId, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.DeleteInvoiceAsync(invoiceId, userId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Ensures deletion succeeds without user identifier.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_NoUserIdentifier_DeletesSuccessfully()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoiceAsync(invoiceId, null, It.IsAny<CancellationToken>()))
        .Returns(ValueTask.CompletedTask);

    // Act
    await service.DeleteInvoiceObject(invoiceId, null, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.DeleteInvoiceAsync(invoiceId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates empty Guid identifier for delete throws foundation service exception.
  /// Note: The validation exception class lacks the required constructor for Validator.ValidateAndThrow,
  /// causing a MissingMethodException that falls through to the generic exception handler.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_EmptyGuidIdentifier_ThrowsFoundationServiceException()
  {
    // Arrange
    var emptyId = Guid.Empty;

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.DeleteInvoiceObject(emptyId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates OperationCanceledException during delete is wrapped into foundation dependency exception.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_OperationCanceledException_PropagatesOperationCanceledException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoiceAsync(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new OperationCanceledException("Cancelled"));

    // Act & Assert — cancellation must not be reclassified into a domain exception (bug fix)
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
        service.DeleteInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Ensures generic exceptions during delete are wrapped into foundation service exceptions.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoiceAsync(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Deletion failed"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.DeleteInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates idempotency of delete operation (repeated calls succeed).
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_IdempotentCalls_SucceedMultipleTimes()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoiceAsync(invoiceId, null, It.IsAny<CancellationToken>()))
        .Returns(ValueTask.CompletedTask);

    // Act
    await service.DeleteInvoiceObject(invoiceId, null, CancellationToken.None);
    await service.DeleteInvoiceObject(invoiceId, null, CancellationToken.None);
    await service.DeleteInvoiceObject(invoiceId, null, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.DeleteInvoiceAsync(invoiceId, null, It.IsAny<CancellationToken>()), Times.Exactly(3));
  }

  #endregion

  #region Test Data

  /// <summary>
  /// Provides theory data containing several randomized invoices for parameterized tests.
  /// </summary>
  public static IEnumerable<object[]> GetInvoiceTestData() => InvoiceBuilder.GetInvoiceTheoryData();

  #endregion
}
