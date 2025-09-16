namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// This class represents the invoice processing service.
/// </summary>
public partial class InvoiceProcessingService : IInvoiceProcessingService
{
	private readonly IInvoiceOrchestrationService invoiceOrchestrationService;
	private readonly IMerchantOrchestrationService merchantOrchestrationService;
	private readonly ILogger<IInvoiceProcessingService> logger;

	/// <summary>
	/// Public constructor.
	/// </summary>
	/// <param name="invoiceOrchestrationService"></param>
	/// <param name="merchantOrchestrationService"></param>
	/// <param name="loggerFactory"></param>
	public InvoiceProcessingService(
		IInvoiceOrchestrationService invoiceOrchestrationService,
		IMerchantOrchestrationService merchantOrchestrationService,
		ILoggerFactory loggerFactory)
	{
		ArgumentNullException.ThrowIfNull(invoiceOrchestrationService);
		ArgumentNullException.ThrowIfNull(merchantOrchestrationService);

		this.invoiceOrchestrationService = invoiceOrchestrationService;
		this.merchantOrchestrationService = merchantOrchestrationService;
		logger = loggerFactory.CreateLogger<IInvoiceProcessingService>();
	}

	#region Analyze Invoice API
	/// <inheritdoc/>
	public async Task AnalyzeInvoice(AnalysisOptions options, Guid identifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoice));
		await invoiceOrchestrationService
			.AnalyzeInvoiceWithOptions(options, identifier, userIdentifier)
			.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Create Invoice API
	/// <inheritdoc/>
	public async Task CreateInvoice(Invoice invoice, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
		await invoiceOrchestrationService
			.CreateInvoiceObject(invoice)
			.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Create Merchant API
	/// <inheritdoc/>
	public async Task CreateMerchant(Merchant merchant, Guid? parentCompanyId = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchant));
		await merchantOrchestrationService
			.CreateMerchantObject(merchant, parentCompanyId)
			.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Delete Invoice API
	/// <inheritdoc/>
	public async Task DeleteInvoice(Guid identifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoice));
		await invoiceOrchestrationService
			.DeleteInvoiceObject(identifier, userIdentifier)
			.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Read Invoices API
	/// <inheritdoc/>
	public async Task<IEnumerable<Invoice>> ReadInvoices(Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoices));
		var invoices = await invoiceOrchestrationService
			.ReadAllInvoiceObjects(userIdentifier)
			.ConfigureAwait(false);
		return invoices;
	}).ConfigureAwait(false);
	#endregion

	#region Read Merchants API
	/// <inheritdoc/>
	public async Task<IEnumerable<Merchant>> ReadMerchants(Guid? parentCompanyId = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchants));
		var merchants = await merchantOrchestrationService
			.ReadAllMerchantObjects(parentCompanyId)
			.ConfigureAwait(false);
		return merchants;
	}).ConfigureAwait(false);
	#endregion

	#region Read Invoice API
	/// <inheritdoc/>
	public async Task<Invoice> ReadInvoice(Guid identifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoice));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(identifier, userIdentifier)
			.ConfigureAwait(false);
		return invoice;
	}).ConfigureAwait(false);
	#endregion

	#region Read Merchant API
	/// <inheritdoc/>
	public async Task<Merchant> ReadMerchant(Guid identifier, Guid? parentCompanyId = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchant));
		var merchant = await merchantOrchestrationService
			.ReadMerchantObject(identifier, parentCompanyId)
			.ConfigureAwait(false);
		return merchant;
	}).ConfigureAwait(false);
	#endregion

	#region Update Invoice API
	/// <inheritdoc/>
	public async Task<Invoice> UpdateInvoice(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoice));
		var newInvoice = await invoiceOrchestrationService
			.UpdateInvoiceObject(updatedInvoice, invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);
		return newInvoice;
	}).ConfigureAwait(false);
	#endregion

	#region Update Merchant API
	/// <inheritdoc/>
	public async Task<Merchant> UpdateMerchant(Merchant updatedMerchant, Guid identifier, Guid? parentCompanyId = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchant));
		var newMerchant = await merchantOrchestrationService
			.UpdateMerchantObject(updatedMerchant, identifier, parentCompanyId)
			.ConfigureAwait(false);
		return newMerchant;
	}).ConfigureAwait(false);
	#endregion

	#region Delete Merchant API
	/// <inheritdoc/>
	public async Task DeleteMerchant(Guid identifier, Guid? parentCompanyId = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchant));
		await merchantOrchestrationService
			.DeleteMerchantObject(identifier)
			.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Add Product API
	/// <inheritdoc/>
	public async Task AddProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(AddProduct));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(invoiceIdentifier)
			.ConfigureAwait(false);

		invoice.Items.Add(product);

		await invoiceOrchestrationService
			.UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Get Products API
	/// <inheritdoc/>
	public async Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(GetProducts));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);

		var products = invoice.Items;
		return products;
	}).ConfigureAwait(false);
	#endregion

	#region Get Product API
	/// <inheritdoc/>
	public async Task<Product> GetProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(GetProduct));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);

		var products = invoice.Items;
		var product = products.FirstOrDefault(
			p => p.RawName.Contains(productName, StringComparison.InvariantCultureIgnoreCase) ||
						p.GenericName.Contains(productName, StringComparison.InvariantCultureIgnoreCase),
			new Product());

		return product;
	}).ConfigureAwait(false);
	#endregion

	#region Delete Product API
	/// <inheritdoc/>
	public async Task DeleteProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteProduct));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(invoiceIdentifier)
			.ConfigureAwait(false);

		var product = invoice.Items.FirstOrDefault(
			p => p.RawName.Contains(productName, StringComparison.InvariantCultureIgnoreCase) ||
						p.GenericName.Contains(productName, StringComparison.InvariantCultureIgnoreCase),
			new Product());

		var newInvoice = invoice;
		newInvoice.Items.Remove(product);

		var currentInvoice = await invoiceOrchestrationService
			.UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);

		return currentInvoice;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task DeleteProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteProduct));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(invoiceIdentifier)
			.ConfigureAwait(false);

		var foundProduct = invoice.Items.FirstOrDefault(
			p => p.RawName.Contains(product.RawName, StringComparison.InvariantCultureIgnoreCase) ||
						p.GenericName.Contains(product.GenericName, StringComparison.InvariantCultureIgnoreCase),
			new Product());

		var newInvoice = invoice;
		newInvoice.Items.Remove(product);

		var currentInvoice = await invoiceOrchestrationService
			.UpdateInvoiceObject(newInvoice, invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);

		return currentInvoice;
	}).ConfigureAwait(false);
	#endregion

	#region Delete Invoices API
	/// <inheritdoc/>
	public async Task DeleteInvoices(Guid userIdentifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoices));
		var possibleInvoices = await invoiceOrchestrationService
			.ReadAllInvoiceObjects(userIdentifier)
			.ConfigureAwait(false);

		foreach (var invoice in possibleInvoices)
		{
			await invoiceOrchestrationService
				.DeleteInvoiceObject(invoice.id, userIdentifier)
				.ConfigureAwait(false);
		}
	}).ConfigureAwait(false);
	#endregion

	#region Create Invoice Scan API
	/// <inheritdoc/>
	public async Task CreateInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceScan));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);
		invoice.Scan = scan;

		await invoiceOrchestrationService
			.UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Read Invoice Scan API
	/// <inheritdoc/>
	public async Task<InvoiceScan> ReadInvoiceScan(Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceScan));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);
		return invoice.Scan;
	}).ConfigureAwait(false);
	#endregion

	#region Update Invoice Scan API
	/// <inheritdoc/>
	public async Task<InvoiceScan> UpdateInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceScan));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);
		invoice.Scan = scan;

		var updatedInvoice = await invoiceOrchestrationService
			.UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);
		return updatedInvoice.Scan;
	}).ConfigureAwait(false);
	#endregion

	#region Delete Invoice Scan API
	/// <inheritdoc/>
	public async Task DeleteInvoiceScan(Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceScan));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);
		invoice.Scan = InvoiceScan.Default();

		await invoiceOrchestrationService
			.UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Add Invoice Metadata API
	/// <inheritdoc/>
	public async Task AddMetadataToInvoice(IDictionary<string, string> metadata, Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(AddMetadataToInvoice));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);

		foreach (var kvp in metadata)
		{
			invoice.AdditionalMetadata[kvp.Key] = kvp.Value;
		}

		await invoiceOrchestrationService
			.UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Update Invoice Metadata API
	/// <inheritdoc/>
	public async Task<IDictionary<string, string>> UpdateMetadataOnInvoice(IDictionary<string, string> metadata, Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMetadataOnInvoice));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);

		foreach (var kvp in metadata)
		{
			invoice.AdditionalMetadata[kvp.Key] = kvp.Value;
		}

		var updatedInvoice = await invoiceOrchestrationService
			.UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);
		return updatedInvoice.AdditionalMetadata;
	}).ConfigureAwait(false);
	#endregion

	#region Get Invoice Metadata API
	/// <inheritdoc/>
	public async Task<IDictionary<string, string>> GetMetadataFromInvoice(Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(GetMetadataFromInvoice));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);
		return invoice.AdditionalMetadata;
	}).ConfigureAwait(false);
	#endregion

	#region Delete Invoice Metadata API
	/// <inheritdoc/>
	public async Task DeleteMetadataFromInvoice(IEnumerable<string> metadataKeys, Guid invoiceIdentifier, Guid? userIdentifier = null) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMetadataFromInvoice));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);

		foreach (var key in metadataKeys)
		{
			invoice.AdditionalMetadata.Remove(key);
		}

		await invoiceOrchestrationService
			.UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier)
			.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion
}
