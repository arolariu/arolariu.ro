namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Linq;
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
/// Extended unit tests for <see cref="InvoiceStorageFoundationService"/> covering additional edge cases,
/// boundary conditions, and exception scenarios for comprehensive code coverage.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
[TestClass]
public sealed class InvoiceStorageFoundationServiceExtendedTests
{
  private readonly Mock<IDatabaseBroker> mockBroker;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IInvoiceStorageFoundationService>> mockLogger;
  private readonly InvoiceStorageFoundationService service;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies.
  /// </summary>
  public InvoiceStorageFoundationServiceExtendedTests()
  {
    mockBroker = new Mock<IDatabaseBroker>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IInvoiceStorageFoundationService>>();

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
        .Returns(mockLogger.Object);

    service = new InvoiceStorageFoundationService(mockBroker.Object, mockLoggerFactory.Object);
  }

  #region CreateInvoiceObject Extended Tests

  /// <summary>
  /// Validates invoice creation with empty Guid user identifier.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_EmptyGuidUserIdentifier_CreatesSuccessfully()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(invoice, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await service.CreateInvoiceObject(invoice, Guid.Empty, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.CreateInvoiceAsync(invoice, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates invoice creation with minimal invoice data.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_MinimalInvoice_CreatesSuccessfully()
  {
    // Arrange
    var invoice = new Invoice { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid() };

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    await service.CreateInvoiceObject(invoice, null, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.CreateInvoiceAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates generic exception is wrapped into foundation service exception.
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
  /// Validates TimeoutException during creation is wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_TimeoutException_ThrowsFoundationServiceException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(invoice, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new TimeoutException("Connection timeout"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.CreateInvoiceObject(invoice, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates ArgumentException during creation is wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_ArgumentException_ThrowsFoundationServiceException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(invoice, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new ArgumentException("Invalid argument"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.CreateInvoiceObject(invoice, null, CancellationToken.None));
  }

  #endregion

  #region ReadInvoiceObject Extended Tests

  /// <summary>
  /// Validates read with specific user identifier.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_WithUserIdentifier_ReturnsInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var expectedInvoice = InvoiceBuilder.CreateRandomInvoice();
    expectedInvoice.UserIdentifier = userId;

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedInvoice);

    // Act
    var result = await service.ReadInvoiceObject(invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(userId, result.UserIdentifier);
  }

  /// <summary>
  /// Validates read with null user identifier.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_NullUserIdentifier_ReturnsInvoice()
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
  }

  /// <summary>
  /// Validates generic exception during read is wrapped.
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

  /// <summary>
  /// Validates NotSupportedException during read is wrapped.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_NotSupportedException_ThrowsFoundationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new NotSupportedException("Not supported"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.ReadInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  #endregion

  #region ReadAllInvoiceObjects Extended Tests

  /// <summary>
  /// Validates bulk read returns empty collection when no invoices exist.
  /// </summary>
  [TestMethod]
  public async Task ReadAllInvoiceObjects_NoInvoices_ReturnsEmptyCollection()
  {
    // Arrange
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(new List<Invoice>());

    // Act
    var result = await service.ReadAllInvoiceObjects(userId, CancellationToken.None);

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
    var expectedInvoices = InvoiceBuilder.CreateMultipleRandomInvoices(500);

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedInvoices);

    // Act
    var result = await service.ReadAllInvoiceObjects(userId, CancellationToken.None);

    // Assert
    Assert.AreEqual(500, result.Count());
  }

  /// <summary>
  /// Validates bulk read with single invoice.
  /// </summary>
  [TestMethod]
  public async Task ReadAllInvoiceObjects_SingleInvoice_ReturnsSingleElement()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var expectedInvoices = new List<Invoice> { InvoiceBuilder.CreateRandomInvoice() };

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedInvoices);

    // Act
    var result = await service.ReadAllInvoiceObjects(userId, CancellationToken.None);

    // Assert
    Assert.ContainsSingle(result);
  }

  /// <summary>
  /// Validates generic exception during bulk read is wrapped.
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

  #region UpdateInvoiceObject Extended Tests

  /// <summary>
  /// Validates successful invoice update.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_ValidInvoice_ReturnsUpdatedInvoice()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.UpdateInvoiceAsync(invoiceId, invoice, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.UpdateInvoiceObject(invoice, invoiceId, null, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
  }

  /// <summary>
  /// Validates generic exception during update is wrapped.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.UpdateInvoiceAsync(invoiceId, invoice, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.UpdateInvoiceObject(invoice, invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates update with user identifier.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_WithUserIdentifier_ReturnsUpdatedInvoice()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.UpdateInvoiceAsync(invoiceId, invoice, It.IsAny<CancellationToken>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.UpdateInvoiceObject(invoice, invoiceId, userId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
  }

  #endregion

  #region DeleteInvoiceObject Extended Tests

  /// <summary>
  /// Validates successful invoice deletion.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_ValidIdentifier_DeletesSuccessfully()
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
  /// Validates deletion with user identifier.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_WithUserIdentifier_DeletesSuccessfully()
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
  /// Validates generic exception during deletion is wrapped.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoiceAsync(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.DeleteInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates idempotent deletion.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoiceObject_MultipleCalls_ExecutesEachTime()
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

  #region Concurrent Operation Tests

  /// <summary>
  /// Validates concurrent create operations complete successfully.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_ConcurrentOperations_AllComplete()
  {
    // Arrange
    var invoices = InvoiceBuilder.CreateMultipleRandomInvoices(10);

    mockBroker
        .Setup(b => b.CreateInvoiceAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
        .ReturnsAsync((Invoice inv, CancellationToken _) => inv);

    // Act
    var tasks = invoices.Select(inv => service.CreateInvoiceObject(inv, null, CancellationToken.None));
    await Task.WhenAll(tasks);

    // Assert
    mockBroker.Verify(b => b.CreateInvoiceAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()), Times.Exactly(10));
  }

  /// <summary>
  /// Validates concurrent read operations complete successfully.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_ConcurrentOperations_AllComplete()
  {
    // Arrange
    var expectedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedInvoice);

    // Act
    var tasks = Enumerable.Range(0, 10).Select(_ => service.ReadInvoiceObject(Guid.NewGuid(), null, CancellationToken.None));
    var results = await Task.WhenAll(tasks);

    // Assert
    foreach (var result in results)
    {
      Assert.IsNotNull(result);
    }
  }

  #endregion

  #region Edge Case Tests

  /// <summary>
  /// Validates handling of OperationCanceledException.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_OperationCanceledException_ThrowsFoundationDependencyException()
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
  /// Validates handling of NullReferenceException.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_ArgumentNullException_ThrowsFoundationServiceException()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new ArgumentNullException("parameter", "Null reference"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.ReadInvoiceObject(invoiceId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates handling of FormatException.
  /// </summary>
  [TestMethod]
  public async Task ReadAllInvoiceObjects_FormatException_ThrowsFoundationServiceException()
  {
    // Arrange
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new FormatException("Format error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.ReadAllInvoiceObjects(userId, CancellationToken.None));
  }

  #endregion
}
