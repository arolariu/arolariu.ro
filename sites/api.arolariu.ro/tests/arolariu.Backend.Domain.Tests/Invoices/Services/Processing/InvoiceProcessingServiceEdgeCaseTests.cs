namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Linq;
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
/// Edge case unit tests for <see cref="InvoiceProcessingService"/> covering
/// product management, scan management, metadata management, and merchant operations.
/// </summary>
public sealed class InvoiceProcessingServiceEdgeCaseTests
{
	private readonly Mock<IInvoiceOrchestrationService> mockInvoiceOrchestrationService;
	private readonly Mock<IMerchantOrchestrationService> mockMerchantOrchestrationService;
	private readonly Mock<ILoggerFactory> mockLoggerFactory;
	private readonly Mock<ILogger<IInvoiceProcessingService>> mockLogger;
	private readonly InvoiceProcessingService service;

	/// <summary>
	/// Initializes test fixtures with mocked dependencies.
	/// </summary>
	public InvoiceProcessingServiceEdgeCaseTests()
	{
		mockInvoiceOrchestrationService = new Mock<IInvoiceOrchestrationService>();
		mockMerchantOrchestrationService = new Mock<IMerchantOrchestrationService>();
		mockLoggerFactory = new Mock<ILoggerFactory>();
		mockLogger = new Mock<ILogger<IInvoiceProcessingService>>();

		mockLoggerFactory
			.Setup(factory => factory.CreateLogger(It.IsAny<string>()))
			.Returns(mockLogger.Object);

		service = new InvoiceProcessingService(
			mockInvoiceOrchestrationService.Object,
			mockMerchantOrchestrationService.Object,
			mockLoggerFactory.Object);
	}

	#region Product Management Edge Cases

	/// <summary>
	/// Validates adding a product to an invoice.
	/// </summary>
	[Fact]
	public async Task AddProduct_ValidProduct_AddsSuccessfully()
	{
		// Arrange
		var product = new Product { RawName = "Test Product" };
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		// Note: AddProduct calls ReadInvoiceObject without userIdentifier param
		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, null))
			.ReturnsAsync(invoice);
		mockInvoiceOrchestrationService
			.Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId))
			.ReturnsAsync(invoice);

		// Act
		await service.AddProduct(product, invoiceId, userId);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId), Times.Once);
	}

	/// <summary>
	/// Validates adding a product with null user identifier.
	/// </summary>
	[Fact]
	public async Task AddProduct_NullUserIdentifier_AddsSuccessfully()
	{
		// Arrange
		var product = new Product { RawName = "Test Product" };
		var invoiceId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, null))
			.ReturnsAsync(invoice);
		mockInvoiceOrchestrationService
			.Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, null))
			.ReturnsAsync(invoice);

		// Act
		await service.AddProduct(product, invoiceId, null);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, null), Times.Once);
	}

	/// <summary>
	/// Validates getting products from an invoice.
	/// </summary>
	[Fact]
	public async Task GetProducts_ValidInvoice_ReturnsProducts()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, userId))
			.ReturnsAsync(invoice);

		// Act
		var result = await service.GetProducts(invoiceId, userId);

		// Assert
		Assert.NotNull(result);
	}

	/// <summary>
	/// Validates getting products returns empty collection when invoice has no products.
	/// </summary>
	[Fact]
	public async Task GetProducts_EmptyProducts_ReturnsEmptyCollection()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();
		invoice.Items.Clear();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, null))
			.ReturnsAsync(invoice);

		// Act
		var result = await service.GetProducts(invoiceId, null);

		// Assert
		Assert.Empty(result);
	}

	/// <summary>
	/// Validates getting a specific product by name.
	/// </summary>
	[Fact]
	public async Task GetProduct_ValidProductName_ReturnsProduct()
	{
		// Arrange
		var productName = "Test Product";
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();
		invoice.Items.Clear();
		invoice.Items.Add(new Product { RawName = productName });

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, userId))
			.ReturnsAsync(invoice);

		// Act
		var result = await service.GetProduct(productName, invoiceId, userId);

		// Assert
		Assert.NotNull(result);
		Assert.Equal(productName, result.RawName);
	}

	/// <summary>
	/// Validates deleting a product by name.
	/// </summary>
	[Fact]
	public async Task DeleteProduct_ValidProductName_DeletesSuccessfully()
	{
		// Arrange
		var productName = "Test Product";
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();
		invoice.Items.Clear();
		invoice.Items.Add(new Product { RawName = productName, GenericName = productName });

		// Note: DeleteProduct calls ReadInvoiceObject without userIdentifier param
		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, null))
			.ReturnsAsync(invoice);
		mockInvoiceOrchestrationService
			.Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId))
			.ReturnsAsync(invoice);

		// Act
		await service.DeleteProduct(productName, invoiceId, userId);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId), Times.Once);
	}

	/// <summary>
	/// Validates deleting a product by product object.
	/// </summary>
	[Fact]
	public async Task DeleteProduct_ByProductObject_DeletesSuccessfully()
	{
		// Arrange
		var product = new Product { RawName = "Test Product", GenericName = "Test Product" };
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();
		invoice.Items.Clear();
		invoice.Items.Add(product);

		// Note: DeleteProduct calls ReadInvoiceObject without userIdentifier param
		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, null))
			.ReturnsAsync(invoice);
		mockInvoiceOrchestrationService
			.Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId))
			.ReturnsAsync(invoice);

		// Act
		await service.DeleteProduct(product, invoiceId, userId);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId), Times.Once);
	}

	/// <summary>
	/// Validates adding product with empty GUID identifier.
	/// </summary>
	[Fact]
	public async Task AddProduct_EmptyGuidInvoiceId_CallsOrchestration()
	{
		// Arrange
		var product = new Product { RawName = "Test" };
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(Guid.Empty, null))
			.ReturnsAsync(invoice);
		mockInvoiceOrchestrationService
			.Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), Guid.Empty, null))
			.ReturnsAsync(invoice);

		// Act
		await service.AddProduct(product, Guid.Empty, null);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.ReadInvoiceObject(Guid.Empty, null), Times.Once);
	}

	#endregion

	#region Scan Management Edge Cases

	/// <summary>
	/// Validates creating an invoice scan.
	/// </summary>
	[Fact]
	public async Task CreateInvoiceScan_ValidScan_CreatesSuccessfully()
	{
		// Arrange
		var scan = new InvoiceScan(ScanType.JPG, new Uri("https://example.com/scan.jpg"), null);
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, userId))
			.ReturnsAsync(invoice);
		mockInvoiceOrchestrationService
			.Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId))
			.ReturnsAsync(invoice);

		// Act
		await service.CreateInvoiceScan(scan, invoiceId, userId);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId), Times.Once);
	}

	/// <summary>
	/// Validates reading invoice scans.
	/// </summary>
	[Fact]
	public async Task ReadInvoiceScans_ValidInvoice_ReturnsScans()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, userId))
			.ReturnsAsync(invoice);

		// Act
		var result = await service.ReadInvoiceScans(invoiceId, userId);

		// Assert
		Assert.NotNull(result);
	}

	/// <summary>
	/// Validates deleting an invoice scan.
	/// </summary>
	[Fact]
	public async Task DeleteInvoiceScan_ValidScan_DeletesSuccessfully()
	{
		// Arrange
		var scan = new InvoiceScan(ScanType.JPG, new Uri("https://example.com/scan.jpg"), null);
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, userId))
			.ReturnsAsync(invoice);
		mockInvoiceOrchestrationService
			.Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId))
			.ReturnsAsync(invoice);

		// Act
		await service.DeleteInvoiceScan(scan, invoiceId, userId);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId), Times.Once);
	}

	/// <summary>
	/// Validates creating scan with PNG type.
	/// </summary>
	[Fact]
	public async Task CreateInvoiceScan_PngType_CreatesSuccessfully()
	{
		// Arrange
		var scan = new InvoiceScan(ScanType.PNG, new Uri("https://example.com/scan.png"), null);
		var invoiceId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, null))
			.ReturnsAsync(invoice);
		mockInvoiceOrchestrationService
			.Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, null))
			.ReturnsAsync(invoice);

		// Act
		await service.CreateInvoiceScan(scan, invoiceId, null);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, null), Times.Once);
	}

	#endregion

	#region Metadata Management Edge Cases

	/// <summary>
	/// Validates adding metadata to an invoice.
	/// </summary>
	[Fact]
	public async Task AddMetadataToInvoice_ValidMetadata_AddsSuccessfully()
	{
		// Arrange
		var metadata = new Dictionary<string, object> { { "key1", "value1" }, { "key2", 123 } };
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, userId))
			.ReturnsAsync(invoice);
		mockInvoiceOrchestrationService
			.Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId))
			.ReturnsAsync(invoice);

		// Act
		await service.AddMetadataToInvoice(metadata, invoiceId, userId);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId), Times.Once);
	}

	/// <summary>
	/// Validates updating metadata on an invoice.
	/// </summary>
	[Fact]
	public async Task UpdateMetadataOnInvoice_ValidMetadata_ReturnsUpdatedMetadata()
	{
		// Arrange
		var metadata = new Dictionary<string, object> { { "key1", "value1" } };
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, userId))
			.ReturnsAsync(invoice);
		mockInvoiceOrchestrationService
			.Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId))
			.ReturnsAsync(invoice);

		// Act
		var result = await service.UpdateMetadataOnInvoice(metadata, invoiceId, userId);

		// Assert
		Assert.NotNull(result);
	}

	/// <summary>
	/// Validates getting metadata from an invoice.
	/// </summary>
	[Fact]
	public async Task GetMetadataFromInvoice_ValidInvoice_ReturnsMetadata()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, userId))
			.ReturnsAsync(invoice);

		// Act
		var result = await service.GetMetadataFromInvoice(invoiceId, userId);

		// Assert
		Assert.NotNull(result);
	}

	/// <summary>
	/// Validates deleting metadata from an invoice.
	/// </summary>
	[Fact]
	public async Task DeleteMetadataFromInvoice_ValidKeys_DeletesSuccessfully()
	{
		// Arrange
		var keys = new[] { "key1", "key2" };
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();
		invoice.AdditionalMetadata.Add("key1", "value1");
		invoice.AdditionalMetadata.Add("key2", "value2");

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, userId))
			.ReturnsAsync(invoice);
		mockInvoiceOrchestrationService
			.Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId))
			.ReturnsAsync(invoice);

		// Act
		await service.DeleteMetadataFromInvoice(keys, invoiceId, userId);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, userId), Times.Once);
	}

	/// <summary>
	/// Validates adding empty metadata dictionary.
	/// </summary>
	[Fact]
	public async Task AddMetadataToInvoice_EmptyMetadata_CompletesSuccessfully()
	{
		// Arrange
		var metadata = new Dictionary<string, object>();
		var invoiceId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, null))
			.ReturnsAsync(invoice);
		mockInvoiceOrchestrationService
			.Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, null))
			.ReturnsAsync(invoice);

		// Act
		await service.AddMetadataToInvoice(metadata, invoiceId, null);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.ReadInvoiceObject(invoiceId, null), Times.Once);
	}

	#endregion

	#region Merchant Processing Edge Cases

	/// <summary>
	/// Validates merchant creation through processing service.
	/// </summary>
	[Fact]
	public async Task CreateMerchant_ValidMerchant_CreatesSuccessfully()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
		var parentCompanyId = Guid.NewGuid();

		mockMerchantOrchestrationService
			.Setup(s => s.CreateMerchantObject(merchant, parentCompanyId))
			.Returns(Task.CompletedTask);

		// Act
		await service.CreateMerchant(merchant, parentCompanyId);

		// Assert
		mockMerchantOrchestrationService.Verify(s => s.CreateMerchantObject(merchant, parentCompanyId), Times.Once);
	}

	/// <summary>
	/// Validates merchant creation with null parent company ID.
	/// </summary>
	[Fact]
	public async Task CreateMerchant_NullParentCompanyId_CreatesSuccessfully()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockMerchantOrchestrationService
			.Setup(s => s.CreateMerchantObject(merchant, null))
			.Returns(Task.CompletedTask);

		// Act
		await service.CreateMerchant(merchant, null);

		// Assert
		mockMerchantOrchestrationService.Verify(s => s.CreateMerchantObject(merchant, null), Times.Once);
	}

	/// <summary>
	/// Validates merchant read through processing service.
	/// </summary>
	[Fact]
	public async Task ReadMerchant_ValidIdentifier_ReturnsMerchant()
	{
		// Arrange
		var merchantId = Guid.NewGuid();
		var parentCompanyId = Guid.NewGuid();
		var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockMerchantOrchestrationService
			.Setup(s => s.ReadMerchantObject(merchantId, parentCompanyId))
			.ReturnsAsync(expectedMerchant);

		// Act
		var result = await service.ReadMerchant(merchantId, parentCompanyId);

		// Assert
		Assert.NotNull(result);
		Assert.Same(expectedMerchant, result);
	}

	/// <summary>
	/// Validates merchant read with null parent company ID.
	/// </summary>
	[Fact]
	public async Task ReadMerchant_NullParentCompanyId_ReturnsMerchant()
	{
		// Arrange
		var merchantId = Guid.NewGuid();
		var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockMerchantOrchestrationService
			.Setup(s => s.ReadMerchantObject(merchantId, null))
			.ReturnsAsync(expectedMerchant);

		// Act
		var result = await service.ReadMerchant(merchantId, null);

		// Assert
		Assert.NotNull(result);
	}

	/// <summary>
	/// Validates reading all merchants through processing service.
	/// </summary>
	[Fact]
	public async Task ReadMerchants_ValidParentCompanyId_ReturnsAllMerchants()
	{
		// Arrange
		var parentCompanyId = Guid.NewGuid();
		var expectedMerchants = Enumerable.Range(0, 5)
			.Select(_ => MerchantTestDataBuilder.CreateRandomMerchant())
			.ToList();

		mockMerchantOrchestrationService
			.Setup(s => s.ReadAllMerchantObjects(parentCompanyId))
			.ReturnsAsync(expectedMerchants);

		// Act
		var result = await service.ReadMerchants(parentCompanyId);

		// Assert
		Assert.Equal(5, result.Count());
	}

	/// <summary>
	/// Validates merchant update through processing service.
	/// </summary>
	[Fact]
	public async Task UpdateMerchant_ValidData_ReturnsUpdatedMerchant()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
		var merchantId = Guid.NewGuid();
		var parentCompanyId = Guid.NewGuid();

		mockMerchantOrchestrationService
			.Setup(s => s.UpdateMerchantObject(merchant, merchantId, parentCompanyId))
			.ReturnsAsync(merchant);

		// Act
		var result = await service.UpdateMerchant(merchant, merchantId, parentCompanyId);

		// Assert
		Assert.NotNull(result);
	}

	/// <summary>
	/// Validates merchant deletion through processing service.
	/// </summary>
	[Fact]
	public async Task DeleteMerchant_ValidIdentifier_DeletesSuccessfully()
	{
		// Arrange
		var merchantId = Guid.NewGuid();
		var parentCompanyId = Guid.NewGuid();

		mockMerchantOrchestrationService
			.Setup(s => s.DeleteMerchantObject(merchantId, parentCompanyId))
			.Returns(Task.CompletedTask);

		// Act
		await service.DeleteMerchant(merchantId, parentCompanyId);

		// Assert
		mockMerchantOrchestrationService.Verify(s => s.DeleteMerchantObject(merchantId, parentCompanyId), Times.Once);
	}

	/// <summary>
	/// Validates merchant deletion with null parent company ID.
	/// </summary>
	[Fact]
	public async Task DeleteMerchant_NullParentCompanyId_DeletesSuccessfully()
	{
		// Arrange
		var merchantId = Guid.NewGuid();

		mockMerchantOrchestrationService
			.Setup(s => s.DeleteMerchantObject(merchantId, null))
			.Returns(Task.CompletedTask);

		// Act
		await service.DeleteMerchant(merchantId, null);

		// Assert
		mockMerchantOrchestrationService.Verify(s => s.DeleteMerchantObject(merchantId, null), Times.Once);
	}

	#endregion

	#region Exception Handling Tests

	/// <summary>
	/// Validates orchestration exception is wrapped during product addition.
	/// </summary>
	[Fact]
	public async Task AddProduct_OrchestrationException_ThrowsProcessingException()
	{
		// Arrange
		var product = new Product { RawName = "Test" };
		var invoiceId = Guid.NewGuid();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, null))
			.ThrowsAsync(new InvoiceOrchestrationServiceException(new InvalidOperationException("Error")));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
			service.AddProduct(product, invoiceId, null));
	}

	/// <summary>
	/// Validates orchestration validation exception is wrapped during product deletion.
	/// </summary>
	[Fact]
	public async Task DeleteProduct_OrchestrationValidationException_ThrowsProcessingValidationException()
	{
		// Arrange
		var productName = "Test";
		var invoiceId = Guid.NewGuid();

		// Note: DeleteProduct calls ReadInvoiceObject without userIdentifier param
		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, null))
			.ThrowsAsync(new InvoiceOrchestrationValidationException(new InvalidOperationException("Validation error")));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceProcessingServiceValidationException>(() =>
			service.DeleteProduct(productName, invoiceId, null));
	}

	/// <summary>
	/// Validates merchant orchestration exception is wrapped during creation.
	/// </summary>
	[Fact]
	public async Task CreateMerchant_OrchestrationException_ThrowsProcessingException()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockMerchantOrchestrationService
			.Setup(s => s.CreateMerchantObject(merchant, null))
			.ThrowsAsync(new MerchantOrchestrationServiceException(new InvalidOperationException("Error")));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
			service.CreateMerchant(merchant, null));
	}

	/// <summary>
	/// Validates merchant orchestration validation exception is wrapped during update.
	/// </summary>
	[Fact]
	public async Task UpdateMerchant_OrchestrationValidationException_ThrowsProcessingDependencyValidationException()
	{
		// Arrange
		var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
		var merchantId = Guid.NewGuid();

		mockMerchantOrchestrationService
			.Setup(s => s.UpdateMerchantObject(merchant, merchantId, null))
			.ThrowsAsync(new MerchantOrchestrationServiceValidationException(new InvalidOperationException("Validation error")));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyValidationException>(() =>
			service.UpdateMerchant(merchant, merchantId, null));
	}

	/// <summary>
	/// Validates generic exception during scan creation is wrapped.
	/// </summary>
	[Fact]
	public async Task CreateInvoiceScan_GenericException_ThrowsProcessingException()
	{
		// Arrange
		var scan = new InvoiceScan(ScanType.JPG, new Uri("https://example.com/scan.jpg"), null);
		var invoiceId = Guid.NewGuid();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, null))
			.ThrowsAsync(new InvalidOperationException("Unexpected error"));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
			service.CreateInvoiceScan(scan, invoiceId, null));
	}

	/// <summary>
	/// Validates generic exception during metadata update is wrapped.
	/// </summary>
	[Fact]
	public async Task UpdateMetadataOnInvoice_GenericException_ThrowsProcessingException()
	{
		// Arrange
		var metadata = new Dictionary<string, object> { { "key", "value" } };
		var invoiceId = Guid.NewGuid();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, null))
			.ThrowsAsync(new InvalidOperationException("Unexpected error"));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceProcessingServiceException>(() =>
			service.UpdateMetadataOnInvoice(metadata, invoiceId, null));
	}

	/// <summary>
	/// Validates dependency exception is wrapped during product get.
	/// </summary>
	[Fact]
	public async Task GetProducts_DependencyException_ThrowsProcessingDependencyException()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, null))
			.ThrowsAsync(new InvoiceOrchestrationDependencyException(new InvalidOperationException("Dependency error")));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyException>(() =>
			service.GetProducts(invoiceId, null));
	}

	#endregion

	#region Concurrent Operation Tests

	/// <summary>
	/// Validates concurrent product additions complete successfully.
	/// </summary>
	[Fact]
	public async Task AddProduct_ConcurrentOperations_AllComplete()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(invoiceId, null))
			.ReturnsAsync(invoice);
		mockInvoiceOrchestrationService
			.Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, null))
			.ReturnsAsync(invoice);

		var products = Enumerable.Range(0, 5)
			.Select(i => new Product { RawName = $"Product {i}" })
			.ToList();

		// Act
		var tasks = products.Select(p => service.AddProduct(p, invoiceId, null));
		await Task.WhenAll(tasks);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), invoiceId, null), Times.Exactly(5));
	}

	/// <summary>
	/// Validates concurrent merchant reads complete successfully.
	/// </summary>
	[Fact]
	public async Task ReadMerchant_ConcurrentOperations_AllComplete()
	{
		// Arrange
		var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

		mockMerchantOrchestrationService
			.Setup(s => s.ReadMerchantObject(It.IsAny<Guid>(), null))
			.ReturnsAsync(expectedMerchant);

		// Act
		var tasks = Enumerable.Range(0, 10)
			.Select(_ => service.ReadMerchant(Guid.NewGuid(), null));
		var results = await Task.WhenAll(tasks);

		// Assert
		Assert.All(results, r => Assert.NotNull(r));
	}

	/// <summary>
	/// Validates concurrent metadata operations complete successfully.
	/// </summary>
	[Fact]
	public async Task GetMetadataFromInvoice_ConcurrentOperations_AllComplete()
	{
		// Arrange
		var invoice = InvoiceBuilder.CreateRandomInvoice();

		mockInvoiceOrchestrationService
			.Setup(s => s.ReadInvoiceObject(It.IsAny<Guid>(), null))
			.ReturnsAsync(invoice);

		// Act
		var tasks = Enumerable.Range(0, 10)
			.Select(_ => service.GetMetadataFromInvoice(Guid.NewGuid(), null));
		var results = await Task.WhenAll(tasks);

		// Assert
		Assert.All(results, r => Assert.NotNull(r));
	}

	#endregion

	#region Analysis Tests

	/// <summary>
	/// Validates invoice analysis with valid options.
	/// </summary>
	[Fact]
	public async Task AnalyzeInvoice_ValidOptions_AnalyzesSuccessfully()
	{
		// Arrange
		var options = new AnalysisOptions();
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();

		mockInvoiceOrchestrationService
			.Setup(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, userId))
			.Returns(Task.CompletedTask);

		// Act
		await service.AnalyzeInvoice(options, invoiceId, userId);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, userId), Times.Once);
	}

	/// <summary>
	/// Validates invoice analysis with null user identifier.
	/// </summary>
	[Fact]
	public async Task AnalyzeInvoice_NullUserIdentifier_AnalyzesSuccessfully()
	{
		// Arrange
		var options = new AnalysisOptions();
		var invoiceId = Guid.NewGuid();

		mockInvoiceOrchestrationService
			.Setup(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, null))
			.Returns(Task.CompletedTask);

		// Act
		await service.AnalyzeInvoice(options, invoiceId, null);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, null), Times.Once);
	}

	/// <summary>
	/// Validates orchestration dependency exception during analysis is wrapped.
	/// </summary>
	[Fact]
	public async Task AnalyzeInvoice_OrchestrationDependencyException_ThrowsProcessingDependencyException()
	{
		// Arrange
		var options = new AnalysisOptions();
		var invoiceId = Guid.NewGuid();

		mockInvoiceOrchestrationService
			.Setup(s => s.AnalyzeInvoiceWithOptions(options, invoiceId, null))
			.ThrowsAsync(new InvoiceOrchestrationDependencyException(new InvalidOperationException("Dependency error")));

		// Act & Assert
		await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyException>(() =>
			service.AnalyzeInvoice(options, invoiceId, null));
	}

	#endregion

	#region Delete Operations Tests

	/// <summary>
	/// Validates single invoice deletion.
	/// </summary>
	[Fact]
	public async Task DeleteInvoice_ValidIdentifier_DeletesSuccessfully()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();

		mockInvoiceOrchestrationService
			.Setup(s => s.DeleteInvoiceObject(invoiceId, userId))
			.Returns(Task.CompletedTask);

		// Act
		await service.DeleteInvoice(invoiceId, userId);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.DeleteInvoiceObject(invoiceId, userId), Times.Once);
	}

	/// <summary>
	/// Validates invoice deletion with null user identifier.
	/// </summary>
	[Fact]
	public async Task DeleteInvoice_NullUserIdentifier_DeletesSuccessfully()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();

		mockInvoiceOrchestrationService
			.Setup(s => s.DeleteInvoiceObject(invoiceId, null))
			.Returns(Task.CompletedTask);

		// Act
		await service.DeleteInvoice(invoiceId, null);

		// Assert
		mockInvoiceOrchestrationService.Verify(s => s.DeleteInvoiceObject(invoiceId, null), Times.Once);
	}

	#endregion
}
