namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

using Moq;

using Xunit;

/// <summary>
/// Extended unit tests for <see cref="MerchantStorageFoundationService"/> covering additional edge cases,
/// boundary conditions, and exception scenarios for comprehensive code coverage.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
public sealed class MerchantStorageFoundationServiceExtendedTests
{
	private readonly Mock<IInvoiceNoSqlBroker> mockBroker;
	private readonly Mock<ILoggerFactory> mockLoggerFactory;
	private readonly Mock<ILogger<IMerchantStorageFoundationService>> mockLogger;
	private readonly MerchantStorageFoundationService service;

	/// <summary>
	/// Initializes test fixtures with mocked dependencies.
	/// </summary>
	public MerchantStorageFoundationServiceExtendedTests()
	{
		mockBroker = new Mock<IInvoiceNoSqlBroker>();
		mockLoggerFactory = new Mock<ILoggerFactory>();
		mockLogger = new Mock<ILogger<IMerchantStorageFoundationService>>();

		mockLoggerFactory
			.Setup(factory => factory.CreateLogger(It.IsAny<string>()))
			.Returns(mockLogger.Object);

		service = new MerchantStorageFoundationService(
			mockBroker.Object,
			mockLoggerFactory.Object);
	}

	#region CreateMerchantObject Extended Tests

	/// <summary>
	/// Validates merchant creation with empty Guid parent company.
	/// </summary>
	[Fact]
	public async Task CreateMerchantObject_EmptyGuidParentCompany_CreatesSuccessfully()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockBroker
			.Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>()))
			.ReturnsAsync(merchant);

		// Act
		await service.CreateMerchantObject(merchant, Guid.Empty);

		// Assert
		mockBroker.Verify(b => b.CreateMerchantAsync(It.IsAny<Merchant>()), Times.Once);
	}

	/// <summary>
	/// Validates merchant creation with null parent company ID.
	/// </summary>
	[Fact]
	public async Task CreateMerchantObject_NullParentCompanyId_CreatesSuccessfully()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockBroker
			.Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>()))
			.ReturnsAsync(merchant);

		// Act
		await service.CreateMerchantObject(merchant, null);

		// Assert
		mockBroker.Verify(b => b.CreateMerchantAsync(It.IsAny<Merchant>()), Times.Once);
	}

	/// <summary>
	/// Validates generic exception during creation is wrapped.
	/// </summary>
	[Fact]
	public async Task CreateMerchantObject_GenericException_ThrowsFoundationServiceException()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockBroker
			.Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>()))
			.ThrowsAsync(new InvalidOperationException("Unexpected error"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceException>(() =>
			service.CreateMerchantObject(merchant, null));
	}

	/// <summary>
	/// Validates TimeoutException during creation is wrapped.
	/// </summary>
	[Fact]
	public async Task CreateMerchantObject_TimeoutException_ThrowsFoundationServiceException()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockBroker
			.Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>()))
			.ThrowsAsync(new TimeoutException("Connection timeout"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceException>(() =>
			service.CreateMerchantObject(merchant, null));
	}

	/// <summary>
	/// Validates DbUpdateException during creation is wrapped.
	/// </summary>
	[Fact]
	public async Task CreateMerchantObject_DbUpdateException_ThrowsFoundationDependencyException()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockBroker
			.Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>()))
			.ThrowsAsync(new DbUpdateException("Database error"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceDependencyException>(() =>
			service.CreateMerchantObject(merchant, null));
	}

	/// <summary>
	/// Validates DbUpdateConcurrencyException during creation is wrapped.
	/// </summary>
	[Fact]
	public async Task CreateMerchantObject_DbUpdateConcurrencyException_ThrowsFoundationDependencyException()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockBroker
			.Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>()))
			.ThrowsAsync(new DbUpdateConcurrencyException("Concurrency error"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceDependencyException>(() =>
			service.CreateMerchantObject(merchant, null));
	}

	#endregion

	#region ReadMerchantObject Extended Tests

	/// <summary>
	/// Validates merchant read with specific parent company ID.
	/// </summary>
	[Fact]
	public async Task ReadMerchantObject_WithParentCompanyId_ReturnsMerchant()
	{
		// Arrange
		var merchantId = Guid.NewGuid();
		var parentCompanyId = Guid.NewGuid();
		var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();
		expectedMerchant.ParentCompanyId = parentCompanyId;

		mockBroker
			.Setup(b => b.ReadMerchantAsync(merchantId, parentCompanyId))
			.ReturnsAsync(expectedMerchant);

		// Act
		var result = await service.ReadMerchantObject(merchantId, parentCompanyId);

		// Assert
		Assert.NotNull(result);
		Assert.Equal(parentCompanyId, result.ParentCompanyId);
	}

	/// <summary>
	/// Validates merchant read with null parent company ID.
	/// </summary>
	[Fact]
	public async Task ReadMerchantObject_NullParentCompanyId_ReturnsMerchant()
	{
		// Arrange
		var merchantId = Guid.NewGuid();
		var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockBroker
			.Setup(b => b.ReadMerchantAsync(merchantId, null))
			.ReturnsAsync(expectedMerchant);

		// Act
		var result = await service.ReadMerchantObject(merchantId, null);

		// Assert
		Assert.NotNull(result);
	}

	/// <summary>
	/// Validates DbUpdateException during read is wrapped.
	/// </summary>
	[Fact]
	public async Task ReadMerchantObject_DbUpdateException_ThrowsFoundationDependencyException()
	{
		// Arrange
		var merchantId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadMerchantAsync(merchantId, null))
			.ThrowsAsync(new DbUpdateException("Database error"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceDependencyException>(() =>
			service.ReadMerchantObject(merchantId, null));
	}

	/// <summary>
	/// Validates generic exception during read is wrapped.
	/// </summary>
	[Fact]
	public async Task ReadMerchantObject_GenericException_ThrowsFoundationServiceException()
	{
		// Arrange
		var merchantId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadMerchantAsync(merchantId, null))
			.ThrowsAsync(new InvalidOperationException("Unexpected error"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceException>(() =>
			service.ReadMerchantObject(merchantId, null));
	}

	#endregion

	#region ReadAllMerchantObjects Extended Tests

	/// <summary>
	/// Validates bulk read returns empty collection when no merchants exist.
	/// </summary>
	[Fact]
	public async Task ReadAllMerchantObjects_NoMerchants_ReturnsEmptyCollection()
	{
		// Arrange
		var parentCompanyId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadMerchantsAsync(parentCompanyId))
			.ReturnsAsync(new List<Merchant>());

		// Act
		var result = await service.ReadAllMerchantObjects(parentCompanyId);

		// Assert
		Assert.NotNull(result);
		Assert.Empty(result);
	}

	/// <summary>
	/// Validates bulk read returns large collection.
	/// </summary>
	[Fact]
	public async Task ReadAllMerchantObjects_LargeCollection_ReturnsAllMerchants()
	{
		// Arrange
		var parentCompanyId = Guid.NewGuid();
		var expectedMerchants = Enumerable.Range(0, 200)
			.Select(_ => MerchantTestDataBuilder.CreateRandomMerchant())
			.ToList();

		mockBroker
			.Setup(b => b.ReadMerchantsAsync(parentCompanyId))
			.ReturnsAsync(expectedMerchants);

		// Act
		var result = await service.ReadAllMerchantObjects(parentCompanyId);

		// Assert
		Assert.Equal(200, result.Count());
	}

	/// <summary>
	/// Validates bulk read with single merchant.
	/// </summary>
	[Fact]
	public async Task ReadAllMerchantObjects_SingleMerchant_ReturnsSingleElement()
	{
		// Arrange
		var parentCompanyId = Guid.NewGuid();
		var expectedMerchants = new List<Merchant> { MerchantTestDataBuilder.CreateRandomMerchant() };

		mockBroker
			.Setup(b => b.ReadMerchantsAsync(parentCompanyId))
			.ReturnsAsync(expectedMerchants);

		// Act
		var result = await service.ReadAllMerchantObjects(parentCompanyId);

		// Assert
		Assert.Single(result);
	}

	/// <summary>
	/// Validates DbUpdateException during bulk read is wrapped.
	/// </summary>
	[Fact]
	public async Task ReadAllMerchantObjects_DbUpdateException_ThrowsFoundationDependencyException()
	{
		// Arrange
		var parentCompanyId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadMerchantsAsync(parentCompanyId))
			.ThrowsAsync(new DbUpdateException("Database error"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceDependencyException>(() =>
			service.ReadAllMerchantObjects(parentCompanyId));
	}

	/// <summary>
	/// Validates generic exception during bulk read is wrapped.
	/// </summary>
	[Fact]
	public async Task ReadAllMerchantObjects_GenericException_ThrowsFoundationServiceException()
	{
		// Arrange
		var parentCompanyId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadMerchantsAsync(parentCompanyId))
			.ThrowsAsync(new InvalidOperationException("Unexpected error"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceException>(() =>
			service.ReadAllMerchantObjects(parentCompanyId));
	}

	#endregion

	#region UpdateMerchantObject Extended Tests

	/// <summary>
	/// Validates successful merchant update.
	/// </summary>
	[Fact]
	public async Task UpdateMerchantObject_ValidMerchant_ReturnsUpdatedMerchant()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
		var merchantId = Guid.NewGuid();
		var parentCompanyId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadMerchantAsync(merchantId, parentCompanyId))
			.ReturnsAsync(merchant);

		mockBroker
			.Setup(b => b.UpdateMerchantAsync(merchant, merchant))
			.ReturnsAsync(merchant);

		// Act
		var result = await service.UpdateMerchantObject(merchant, merchantId, parentCompanyId);

		// Assert
		Assert.NotNull(result);
	}

	/// <summary>
	/// Validates DbUpdateException during update is wrapped.
	/// </summary>
	[Fact]
	public async Task UpdateMerchantObject_DbUpdateException_ThrowsFoundationDependencyException()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
		var merchantId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadMerchantAsync(merchantId, null))
			.ThrowsAsync(new DbUpdateException("Database error"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceDependencyException>(() =>
			service.UpdateMerchantObject(merchant, merchantId, null));
	}

	/// <summary>
	/// Validates DbUpdateConcurrencyException during update is wrapped.
	/// </summary>
	[Fact]
	public async Task UpdateMerchantObject_DbUpdateConcurrencyException_ThrowsFoundationDependencyException()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
		var merchantId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadMerchantAsync(merchantId, null))
			.ThrowsAsync(new DbUpdateConcurrencyException("Concurrency error"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceDependencyException>(() =>
			service.UpdateMerchantObject(merchant, merchantId, null));
	}

	/// <summary>
	/// Validates generic exception during update is wrapped.
	/// </summary>
	[Fact]
	public async Task UpdateMerchantObject_GenericException_ThrowsFoundationServiceException()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
		var merchantId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadMerchantAsync(merchantId, null))
			.ThrowsAsync(new InvalidOperationException("Unexpected error"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceException>(() =>
			service.UpdateMerchantObject(merchant, merchantId, null));
	}

	#endregion

	#region DeleteMerchantObject Extended Tests

	/// <summary>
	/// Validates successful merchant deletion.
	/// </summary>
	[Fact]
	public async Task DeleteMerchantObject_ValidIdentifier_DeletesSuccessfully()
	{
		// Arrange
		var merchantId = Guid.NewGuid();
		var parentCompanyId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.DeleteMerchantAsync(merchantId, parentCompanyId))
			.Returns(ValueTask.CompletedTask);

		// Act
		await service.DeleteMerchantObject(merchantId, parentCompanyId);

		// Assert
		mockBroker.Verify(b => b.DeleteMerchantAsync(merchantId, parentCompanyId), Times.Once);
	}

	/// <summary>
	/// Validates DbUpdateException during deletion is wrapped.
	/// </summary>
	[Fact]
	public async Task DeleteMerchantObject_DbUpdateException_ThrowsFoundationDependencyException()
	{
		// Arrange
		var merchantId = Guid.NewGuid();
		var parentCompanyId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.DeleteMerchantAsync(merchantId, parentCompanyId))
			.ThrowsAsync(new DbUpdateException("Database error"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceDependencyException>(() =>
			service.DeleteMerchantObject(merchantId, parentCompanyId));
	}

	/// <summary>
	/// Validates generic exception during deletion is wrapped.
	/// </summary>
	[Fact]
	public async Task DeleteMerchantObject_GenericException_ThrowsFoundationServiceException()
	{
		// Arrange
		var merchantId = Guid.NewGuid();
		var parentCompanyId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.DeleteMerchantAsync(merchantId, parentCompanyId))
			.ThrowsAsync(new InvalidOperationException("Unexpected error"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceException>(() =>
			service.DeleteMerchantObject(merchantId, parentCompanyId));
	}

	/// <summary>
	/// Validates idempotent deletion.
	/// </summary>
	[Fact]
	public async Task DeleteMerchantObject_MultipleCalls_ExecutesEachTime()
	{
		// Arrange
		var merchantId = Guid.NewGuid();
		var parentCompanyId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.DeleteMerchantAsync(merchantId, parentCompanyId))
			.Returns(ValueTask.CompletedTask);

		// Act
		await service.DeleteMerchantObject(merchantId, parentCompanyId);
		await service.DeleteMerchantObject(merchantId, parentCompanyId);
		await service.DeleteMerchantObject(merchantId, parentCompanyId);

		// Assert
		mockBroker.Verify(b => b.DeleteMerchantAsync(merchantId, parentCompanyId), Times.Exactly(3));
	}

	#endregion

	#region Concurrent Operation Tests

	/// <summary>
	/// Validates concurrent create operations complete successfully.
	/// </summary>
	[Fact]
	public async Task CreateMerchantObject_ConcurrentOperations_AllComplete()
	{
		// Arrange
		var merchants = Enumerable.Range(0, 10)
			.Select(_ => MerchantTestDataBuilder.CreateRandomMerchant())
			.ToList();

		mockBroker
			.Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>()))
			.ReturnsAsync((Merchant m) => m);

		// Act
		var tasks = merchants.Select(m => service.CreateMerchantObject(m, null));
		await Task.WhenAll(tasks);

		// Assert
		mockBroker.Verify(b => b.CreateMerchantAsync(It.IsAny<Merchant>()), Times.Exactly(10));
	}

	/// <summary>
	/// Validates concurrent read operations complete successfully.
	/// </summary>
	[Fact]
	public async Task ReadMerchantObject_ConcurrentOperations_AllComplete()
	{
		// Arrange
		var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockBroker
			.Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), null))
			.ReturnsAsync(expectedMerchant);

		// Act
		var tasks = Enumerable.Range(0, 10).Select(_ => service.ReadMerchantObject(Guid.NewGuid(), null));
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
	public async Task CreateMerchantObject_OperationCanceledException_ThrowsFoundationDependencyException()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockBroker
			.Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>()))
			.ThrowsAsync(new OperationCanceledException("Operation cancelled"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceDependencyException>(() =>
			service.CreateMerchantObject(merchant, null));
	}

	/// <summary>
	/// Validates handling of ArgumentException from broker.
	/// </summary>
	[Fact]
	public async Task CreateMerchantObject_ArgumentException_ThrowsFoundationServiceException()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockBroker
			.Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>()))
			.ThrowsAsync(new ArgumentException("Invalid argument"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceException>(() =>
			service.CreateMerchantObject(merchant, null));
	}

	/// <summary>
	/// Validates handling of NullReferenceException.
	/// </summary>
	[Fact]
	public async Task ReadMerchantObject_NullReferenceException_ThrowsFoundationServiceException()
	{
		// Arrange
		var merchantId = Guid.NewGuid();

		mockBroker
			.Setup(b => b.ReadMerchantAsync(merchantId, null))
			.ThrowsAsync(new NullReferenceException("Null reference"));

		// Act & Assert
		await Assert.ThrowsAsync<MerchantFoundationServiceException>(() =>
			service.ReadMerchantObject(merchantId, null));
	}

	#endregion
}
