namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Linq;
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
/// Extended unit tests for <see cref="InvoiceStorageFoundationService"/> covering additional edge cases,
/// boundary conditions, and exception scenarios for comprehensive code coverage.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
public sealed class InvoiceStorageFoundationServiceExtendedTests
{
	private readonly Mock<IInvoiceNoSqlBroker> mockBroker;
	private readonly Mock<ILoggerFactory> mockLoggerFactory;
	private readonly Mock<ILogger<IInvoiceStorageFoundationService>> mockLogger;
	private readonly InvoiceStorageFoundationService service;

	/// <summary>
	/// Initializes test fixtures with mocked dependencies.
	/// </summary>
	public InvoiceStorageFoundationServiceExtendedTests()
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

	#region CreateInvoiceObject Extended Tests

	/// <summary>
	/// Validates invoice creation with empty Guid user identifier.
	/// </summary>
	[Fact]
	public async Task CreateInvoiceObject_EmptyGuidUserIdentifier_CreatesSuccessfully()
	{
		// Arrange
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockBroker
			.Setup(b => b.CreateInvoiceAsync(invoice))
			.ReturnsAsync(invoice);

		// Act
		await service.CreateInvoiceObject(invoice, Guid.Empty);

		// Assert
		mockBroker.Verify(b => b.CreateInvoiceAsync(invoice), Times.Once);
	}

	/// <summary>
	/// Validates invoice creation with minimal invoice data.
	/// </summary>
	[Fact]
	public async Task CreateInvoiceObject_MinimalInvoice_CreatesSuccessfully()
	{
		// Arrange
		var invoice = new Invoice { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid() };

		mockBroker
			.Setup(b => b.CreateInvoiceAsync(It.IsAny<Invoice>()))
			.ReturnsAsync(invoice);

		// Act
		await service.CreateInvoiceObject(invoice, null);

		// Assert
		mockBroker.Verify(b => b.CreateInvoiceAsync(It.IsAny<Invoice>()), Times.Once);
	}

	/// <summary>
	/// Validates generic exception is wrapped into foundation service exception.
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
	/// Validates TimeoutException during creation is wrapped appropriately.
	/// </summary>
	[Fact]
	public async Task CreateInvoiceObject_TimeoutException_ThrowsFoundationServiceException()
	{
		// Arrange
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockBroker
			.Setup(b => b.CreateInvoiceAsync(invoice))
			.ThrowsAsync(new TimeoutException("Connection timeout"));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
			service.CreateInvoiceObject(invoice, null));
	}

	/// <summary>
	/// Validates ArgumentException during creation is wrapped appropriately.
	/// </summary>
	[Fact]
	public async Task CreateInvoiceObject_ArgumentException_ThrowsFoundationServiceException()
	{
		// Arrange
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockBroker
			.Setup(b => b.CreateInvoiceAsync(invoice))
			.ThrowsAsync(new ArgumentException("Invalid argument"));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
			service.CreateInvoiceObject(invoice, null));
	}

	#endregion

	#region ReadInvoiceObject Extended Tests

	/// <summary>
	/// Validates read with specific user identifier.
	/// </summary>
	[Fact]
	public async Task ReadInvoiceObject_WithUserIdentifier_ReturnsInvoice()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var expectedInvoice = InvoiceBuilder.CreateRandomInvoice();
		expectedInvoice.UserIdentifier = userId;

		mockBroker
			.Setup(b => b.ReadInvoiceAsync(invoiceId, userId))
			.ReturnsAsync(expectedInvoice);

		// Act
		var result = await service.ReadInvoiceObject(invoiceId, userId);

		// Assert
		Assert.NotNull(result);
		Assert.Equal(userId, result.UserIdentifier);
	}

	/// <summary>
	/// Validates read with null user identifier.
	/// </summary>
	[Fact]
	public async Task ReadInvoiceObject_NullUserIdentifier_ReturnsInvoice()
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
	}

	/// <summary>
	/// Validates DbUpdateException during read is wrapped.
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
	/// Validates generic exception during read is wrapped.
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

	/// <summary>
	/// Validates NotSupportedException during read is wrapped.
	/// </summary>
	[Fact]
	public async Task ReadInvoiceObject_NotSupportedException_ThrowsFoundationServiceException()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadInvoiceAsync(invoiceId, null))
			.ThrowsAsync(new NotSupportedException("Not supported"));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
			service.ReadInvoiceObject(invoiceId, null));
	}

	#endregion

	#region ReadAllInvoiceObjects Extended Tests

	/// <summary>
	/// Validates bulk read returns empty collection when no invoices exist.
	/// </summary>
	[Fact]
	public async Task ReadAllInvoiceObjects_NoInvoices_ReturnsEmptyCollection()
	{
		// Arrange
		var userId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadInvoicesAsync(userId))
			.ReturnsAsync(new List<Invoice>());

		// Act
		var result = await service.ReadAllInvoiceObjects(userId);

		// Assert
		Assert.NotNull(result);
		Assert.Empty(result);
	}

	/// <summary>
	/// Validates bulk read returns large collection.
	/// </summary>
	[Fact]
	public async Task ReadAllInvoiceObjects_LargeCollection_ReturnsAllInvoices()
	{
		// Arrange
		var userId = Guid.NewGuid();
		var expectedInvoices = InvoiceBuilder.CreateMultipleRandomInvoices(500);

		mockBroker
			.Setup(b => b.ReadInvoicesAsync(userId))
			.ReturnsAsync(expectedInvoices);

		// Act
		var result = await service.ReadAllInvoiceObjects(userId);

		// Assert
		Assert.Equal(500, result.Count());
	}

	/// <summary>
	/// Validates bulk read with single invoice.
	/// </summary>
	[Fact]
	public async Task ReadAllInvoiceObjects_SingleInvoice_ReturnsSingleElement()
	{
		// Arrange
		var userId = Guid.NewGuid();
		var expectedInvoices = new List<Invoice> { InvoiceBuilder.CreateRandomInvoice() };

		mockBroker
			.Setup(b => b.ReadInvoicesAsync(userId))
			.ReturnsAsync(expectedInvoices);

		// Act
		var result = await service.ReadAllInvoiceObjects(userId);

		// Assert
		Assert.Single(result);
	}

	/// <summary>
	/// Validates DbUpdateException during bulk read is wrapped.
	/// </summary>
	[Fact]
	public async Task ReadAllInvoiceObjects_DbUpdateException_ThrowsFoundationServiceException()
	{
		// Arrange
		var userId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadInvoicesAsync(userId))
			.ThrowsAsync(new DbUpdateException("Database error"));

		// Act & Assert - ReadAll uses different exception handler that wraps into ServiceException
		await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
			service.ReadAllInvoiceObjects(userId));
	}

	/// <summary>
	/// Validates generic exception during bulk read is wrapped.
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

	#region UpdateInvoiceObject Extended Tests

	/// <summary>
	/// Validates successful invoice update.
	/// </summary>
	[Fact]
	public async Task UpdateInvoiceObject_ValidInvoice_ReturnsUpdatedInvoice()
	{
		// Arrange
		var invoice = InvoiceBuilder.CreateRandomInvoice();
		var invoiceId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.UpdateInvoiceAsync(invoiceId, invoice))
			.ReturnsAsync(invoice);

		// Act
		var result = await service.UpdateInvoiceObject(invoice, invoiceId, null);

		// Assert
		Assert.NotNull(result);
	}

	/// <summary>
	/// Validates DbUpdateException during update is wrapped.
	/// </summary>
	[Fact]
	public async Task UpdateInvoiceObject_DbUpdateException_ThrowsFoundationDependencyException()
	{
		// Arrange
		var invoice = InvoiceBuilder.CreateRandomInvoice();
		var invoiceId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.UpdateInvoiceAsync(invoiceId, invoice))
			.ThrowsAsync(new DbUpdateException("Database error"));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(() =>
			service.UpdateInvoiceObject(invoice, invoiceId, null));
	}

	/// <summary>
	/// Validates DbUpdateConcurrencyException during update is wrapped.
	/// </summary>
	[Fact]
	public async Task UpdateInvoiceObject_DbUpdateConcurrencyException_ThrowsFoundationDependencyException()
	{
		// Arrange
		var invoice = InvoiceBuilder.CreateRandomInvoice();
		var invoiceId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.UpdateInvoiceAsync(invoiceId, invoice))
			.ThrowsAsync(new DbUpdateConcurrencyException("Concurrency error"));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(() =>
			service.UpdateInvoiceObject(invoice, invoiceId, null));
	}

	/// <summary>
	/// Validates generic exception during update is wrapped.
	/// </summary>
	[Fact]
	public async Task UpdateInvoiceObject_GenericException_ThrowsFoundationServiceException()
	{
		// Arrange
		var invoice = InvoiceBuilder.CreateRandomInvoice();
		var invoiceId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.UpdateInvoiceAsync(invoiceId, invoice))
			.ThrowsAsync(new InvalidOperationException("Unexpected error"));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
			service.UpdateInvoiceObject(invoice, invoiceId, null));
	}

	/// <summary>
	/// Validates update with user identifier.
	/// </summary>
	[Fact]
	public async Task UpdateInvoiceObject_WithUserIdentifier_ReturnsUpdatedInvoice()
	{
		// Arrange
		var invoice = InvoiceBuilder.CreateRandomInvoice();
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.UpdateInvoiceAsync(invoiceId, invoice))
			.ReturnsAsync(invoice);

		// Act
		var result = await service.UpdateInvoiceObject(invoice, invoiceId, userId);

		// Assert
		Assert.NotNull(result);
	}

	#endregion

	#region DeleteInvoiceObject Extended Tests

	/// <summary>
	/// Validates successful invoice deletion.
	/// </summary>
	[Fact]
	public async Task DeleteInvoiceObject_ValidIdentifier_DeletesSuccessfully()
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
	/// Validates deletion with user identifier.
	/// </summary>
	[Fact]
	public async Task DeleteInvoiceObject_WithUserIdentifier_DeletesSuccessfully()
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
	/// Validates DbUpdateException during deletion is wrapped.
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
	/// Validates generic exception during deletion is wrapped.
	/// </summary>
	[Fact]
	public async Task DeleteInvoiceObject_GenericException_ThrowsFoundationServiceException()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.DeleteInvoiceAsync(invoiceId, null))
			.ThrowsAsync(new InvalidOperationException("Unexpected error"));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
			service.DeleteInvoiceObject(invoiceId, null));
	}

	/// <summary>
	/// Validates idempotent deletion.
	/// </summary>
	[Fact]
	public async Task DeleteInvoiceObject_MultipleCalls_ExecutesEachTime()
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

	#region Concurrent Operation Tests

	/// <summary>
	/// Validates concurrent create operations complete successfully.
	/// </summary>
	[Fact]
	public async Task CreateInvoiceObject_ConcurrentOperations_AllComplete()
	{
		// Arrange
		var invoices = InvoiceBuilder.CreateMultipleRandomInvoices(10);

		mockBroker
			.Setup(b => b.CreateInvoiceAsync(It.IsAny<Invoice>()))
			.ReturnsAsync((Invoice inv) => inv);

		// Act
		var tasks = invoices.Select(inv => service.CreateInvoiceObject(inv, null));
		await Task.WhenAll(tasks);

		// Assert
		mockBroker.Verify(b => b.CreateInvoiceAsync(It.IsAny<Invoice>()), Times.Exactly(10));
	}

	/// <summary>
	/// Validates concurrent read operations complete successfully.
	/// </summary>
	[Fact]
	public async Task ReadInvoiceObject_ConcurrentOperations_AllComplete()
	{
		// Arrange
		var expectedInvoice = InvoiceBuilder.CreateRandomInvoice();

		mockBroker
			.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), null))
			.ReturnsAsync(expectedInvoice);

		// Act
		var tasks = Enumerable.Range(0, 10).Select(_ => service.ReadInvoiceObject(Guid.NewGuid(), null));
		var results = await Task.WhenAll(tasks);

		// Assert
		Assert.All(results, result => Assert.NotNull(result));
	}

	#endregion

	#region Edge Case Tests

	/// <summary>
	/// Validates handling of OperationCanceledException.
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
	/// Validates handling of NullReferenceException.
	/// </summary>
	[Fact]
	public async Task ReadInvoiceObject_NullReferenceException_ThrowsFoundationServiceException()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadInvoiceAsync(invoiceId, null))
			.ThrowsAsync(new NullReferenceException("Null reference"));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
			service.ReadInvoiceObject(invoiceId, null));
	}

	/// <summary>
	/// Validates handling of FormatException.
	/// </summary>
	[Fact]
	public async Task ReadAllInvoiceObjects_FormatException_ThrowsFoundationServiceException()
	{
		// Arrange
		var userId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadInvoicesAsync(userId))
			.ThrowsAsync(new FormatException("Format error"));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
			service.ReadAllInvoiceObjects(userId));
	}

	#endregion
}
