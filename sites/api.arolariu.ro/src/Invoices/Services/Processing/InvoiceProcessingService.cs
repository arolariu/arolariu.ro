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
	public async Task AnalyzeInvoice(Invoice invoice, AnalysisOptions options) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoice));
		await invoiceOrchestrationService.AnalyzeInvoiceWithOptions(invoice, options)
											.ConfigureAwait(false);
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task AnalyzeInvoice(Guid identifier, AnalysisOptions options) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoice));
		var invoice = await invoiceOrchestrationService.ReadInvoiceObject(identifier, Guid.Empty)
															.ConfigureAwait(false);

		await invoiceOrchestrationService.AnalyzeInvoiceWithOptions(invoice, options)
											.ConfigureAwait(false);

	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task AnalyzeInvoice(Guid identifier, Guid userIdentifier, AnalysisOptions options) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoice));
		var invoice = await invoiceOrchestrationService.ReadInvoiceObject(identifier, userIdentifier)
															.ConfigureAwait(false);

		await invoiceOrchestrationService.AnalyzeInvoiceWithOptions(invoice, options)
															.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Create Invoice API
	/// <inheritdoc/>
	public async Task<Invoice> CreateInvoice(Invoice invoice) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
		await invoiceOrchestrationService.CreateInvoiceObject(invoice)
											.ConfigureAwait(false);

		return invoice;
	}).ConfigureAwait(false);
	#endregion

	#region Create Merchant API
	/// <inheritdoc/>
	public async Task<Merchant> CreateMerchant(Merchant merchant) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchant));
		await merchantOrchestrationService.CreateMerchantObject(merchant)
											.ConfigureAwait(false);

		return merchant;
	}).ConfigureAwait(false);
	#endregion

	#region Delete Invoice API
	/// <inheritdoc/>
	public async Task DeleteInvoice(Guid identifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoice));
		await invoiceOrchestrationService.DeleteInvoiceObject(identifier).ConfigureAwait(false);
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task DeleteInvoice(Guid identifier, Guid userIdentifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoice));
		await invoiceOrchestrationService.DeleteInvoiceObject(identifier, userIdentifier)
											.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Delete Merchant API
	/// <inheritdoc/>
	public async Task DeleteMerchant(Guid identifier, Guid parentCompanyId) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchant));
		await merchantOrchestrationService.DeleteMerchantObject(identifier, parentCompanyId)
											.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Read Invoices API
	/// <inheritdoc/>
	public async Task<IEnumerable<Invoice>> ReadInvoices() =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoices));
		var invoices = 
			await invoiceOrchestrationService.ReadAllInvoiceObjects().ConfigureAwait(false);

		return invoices;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<IEnumerable<Invoice>> ReadInvoices(Guid userIdentifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoices));
		var invoices = 
			await invoiceOrchestrationService.ReadAllInvoiceObjects(userIdentifier).ConfigureAwait(false);

		return invoices;
	}).ConfigureAwait(false);
	#endregion

	#region Read Merchants API
	/// <inheritdoc/>
	public async Task<IEnumerable<Merchant>> ReadMerchants(Guid parentCompanyId) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchants));
		var merchants = await merchantOrchestrationService.ReadAllMerchantObjects(parentCompanyId)
																				.ConfigureAwait(false);

		return merchants;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<IEnumerable<Merchant>> ReadMerchants() =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchants));
		var merchants = await merchantOrchestrationService.ReadAllMerchantObjects()
																	.ConfigureAwait(false);

		return merchants;
	}).ConfigureAwait(false);
	#endregion

	#region Read Invoice API
	/// <inheritdoc/>
	public async Task<Invoice> ReadInvoice(Guid identifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoice));
		var invoice =
			await invoiceOrchestrationService.ReadInvoiceObject(identifier).ConfigureAwait(false);

		return invoice;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Invoice> ReadInvoice(Guid identifier, Guid userIdentifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoice));
		var invoice = await invoiceOrchestrationService.ReadInvoiceObject(identifier, userIdentifier)
																.ConfigureAwait(false);

		return invoice;
	}).ConfigureAwait(false);
	#endregion

	#region Read Merchant API
	/// <inheritdoc/>
	public async Task<Merchant> ReadMerchant(Guid identifier, Guid parentCompanyId) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchant));
		var merchant = await merchantOrchestrationService.ReadMerchantObject(identifier, parentCompanyId)
																	.ConfigureAwait(false);

		return merchant;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Merchant> ReadMerchant(Guid identifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchant));
		var merchant = await merchantOrchestrationService.ReadMerchantObject(identifier)
																	.ConfigureAwait(false);

		return merchant;
	}).ConfigureAwait(false);
	#endregion

	#region Update Invoice API
	/// <inheritdoc/>
	public async Task<Invoice> UpdateInvoice(Invoice currentInvoice, Invoice updatedInvoice) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoice));
		var invoice = await invoiceOrchestrationService.UpdateInvoiceObject(currentInvoice, updatedInvoice)
																.ConfigureAwait(false);

		return invoice;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Invoice> UpdateInvoice(Guid invoiceIdentifier, Invoice updatedInvoice) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoice));
		var currentInvoice = await invoiceOrchestrationService.ReadInvoiceObject(invoiceIdentifier)
																.ConfigureAwait(false);

		var newInvoice = await invoiceOrchestrationService.UpdateInvoiceObject(currentInvoice, updatedInvoice)
																.ConfigureAwait(false);

		return newInvoice;
	}).ConfigureAwait(false);
	#endregion

	#region Update Merchant API
	/// <inheritdoc/>
	public async Task<Merchant> UpdateMerchant(Merchant currentMerchant, Merchant updatedMerchant) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchant));
		var merchant = await merchantOrchestrationService.UpdateMerchantObject(currentMerchant, updatedMerchant)
																	.ConfigureAwait(false);

		return merchant;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Merchant> UpdateMerchant(Guid identifier, Merchant updatedMerchant) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchant));
		var merchant = await merchantOrchestrationService.UpdateMerchantObject(identifier, updatedMerchant)
																	.ConfigureAwait(false);

		return merchant;
	}).ConfigureAwait(false);
	#endregion

	#region Delete Merchant API
	/// <inheritdoc/>
	public async Task DeleteMerchant(Guid identifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchant));
		await merchantOrchestrationService.DeleteMerchantObject(identifier)
											.ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Add Product API
	/// <inheritdoc/>
	public async Task<Invoice> AddProduct(Invoice invoice, Product product) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(AddProduct));
		var newInvoice = invoice;
		newInvoice.Items.Add(product);

		await invoiceOrchestrationService.UpdateInvoiceObject(invoice, newInvoice)
											.ConfigureAwait(false);

		return invoice;
	}).ConfigureAwait(false);


	/// <inheritdoc/>
	public async Task<Invoice> AddProduct(Guid invoiceIdentifier, Product product) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(AddProduct));
		var invoice = await invoiceOrchestrationService.ReadInvoiceObject(invoiceIdentifier)
															.ConfigureAwait(false);

		invoice.Items.Add(product);
		await invoiceOrchestrationService.UpdateInvoiceObject(invoiceIdentifier, invoice)
											.ConfigureAwait(false);

		return invoice;
	}).ConfigureAwait(false);
	#endregion

	#region Get Products API
	/// <inheritdoc/>
	public async Task<IEnumerable<Product>> GetProducts(Invoice invoice) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(GetProducts));
		var products = invoice.Items;
		return await Task.FromResult(products).ConfigureAwait(false);
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(GetProducts));
		var invoice = await invoiceOrchestrationService.ReadInvoiceObject(invoiceIdentifier)
															.ConfigureAwait(false);
		
		var products = invoice.Items;
		return products;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid userIdentifier) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(GetProducts));
		var invoice = await invoiceOrchestrationService.ReadInvoiceObject(invoiceIdentifier, userIdentifier)
															.ConfigureAwait(false);
		
		var products = invoice.Items;
		return products;
	}).ConfigureAwait(false);
	#endregion

	#region Get Product API
	/// <inheritdoc/>
	public async Task<Product> GetProduct(Guid invoiceIdentifier, string productName) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(GetProduct));
		var invoice = await invoiceOrchestrationService.ReadInvoiceObject(invoiceIdentifier)
															.ConfigureAwait(false);

		var products = invoice.Items;
		var product = products.FirstOrDefault(
							p => p.RawName.Contains(productName, StringComparison.InvariantCultureIgnoreCase) ||
												p.GenericName.Contains(productName, StringComparison.InvariantCultureIgnoreCase),
							new Product());

		return product;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Product> GetProduct(Invoice invoice, string productName) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(GetProduct));
		var product = invoice.Items.FirstOrDefault(
							p => p.RawName.Contains(productName, StringComparison.InvariantCultureIgnoreCase) ||
												p.GenericName.Contains(productName, StringComparison.InvariantCultureIgnoreCase),
							new Product());

		return await Task.FromResult(product).ConfigureAwait(false);
	}).ConfigureAwait(false);
	#endregion

	#region Delete Product API
	/// <inheritdoc/>
	public async Task<Invoice> DeleteProduct(Guid invoiceIdentifier, string productName) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteProduct));
		var invoice = await invoiceOrchestrationService.ReadInvoiceObject(invoiceIdentifier)
															.ConfigureAwait(false);

		var product = invoice.Items.FirstOrDefault(
							p => p.RawName.Contains(productName, StringComparison.InvariantCultureIgnoreCase) ||
												p.GenericName.Contains(productName, StringComparison.InvariantCultureIgnoreCase),
							new Product());

		var newInvoice = invoice;
		newInvoice.Items.Remove(product);

		var currentInvoice = await invoiceOrchestrationService.UpdateInvoiceObject(invoice, newInvoice)
																		.ConfigureAwait(false);

		return currentInvoice;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Invoice> DeleteProduct(Guid invoiceIdentifier, Product product) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteProduct));
		var invoice = await invoiceOrchestrationService.ReadInvoiceObject(invoiceIdentifier)
															.ConfigureAwait(false);

		var foundProduct = invoice.Items.FirstOrDefault(
							p => p.RawName.Contains(product.RawName, StringComparison.InvariantCultureIgnoreCase) ||
												p.GenericName.Contains(product.GenericName, StringComparison.InvariantCultureIgnoreCase),
							new Product());
		var newInvoice = invoice;
		newInvoice.Items.Remove(product);

		var currentInvoice = await invoiceOrchestrationService.UpdateInvoiceObject(invoice, newInvoice)
																		.ConfigureAwait(false);

		return currentInvoice;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Invoice> DeleteProduct(Invoice invoice, string productName) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteProduct));
		var product = invoice.Items.FirstOrDefault(
							p => p.RawName.Contains(productName, StringComparison.InvariantCultureIgnoreCase) ||
												p.GenericName.Contains(productName, StringComparison.InvariantCultureIgnoreCase),
							new Product());
		var newInvoice = invoice;
		newInvoice.Items.Remove(product);

		var currentInvoice = await invoiceOrchestrationService.UpdateInvoiceObject(invoice, newInvoice)
																		.ConfigureAwait(false);
		return currentInvoice;
	}).ConfigureAwait(false);

	/// <inheritdoc/>
	public async Task<Invoice> DeleteProduct(Invoice invoice, Product product) =>
	await TryCatchAsync(async () =>
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteProduct));
		var newInvoice = invoice;
		newInvoice.Items.Remove(product);

		var currentInvoice = await invoiceOrchestrationService.UpdateInvoiceObject(invoice, newInvoice)
																		.ConfigureAwait(false);

		return currentInvoice;
	}).ConfigureAwait(false);
	#endregion
}
