namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
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

	[SuppressMessage("Critical Code Smell", "S4487:Unread \"private\" fields should be removed", Justification = "<Pending>")]
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

	/// <inheritdoc/>
	public async Task AnalyzeInvoiceWithOptions(Guid invoiceIdentifier, Guid userIdentifier, AnalysisOptions options)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoiceWithOptions));
		await invoiceOrchestrationService
			.AnalyzeInvoiceWithOptions(invoiceIdentifier, userIdentifier, options)
			.ConfigureAwait(false);
	}

	/// <inheritdoc/>
	public async Task<Invoice> CreateInvoiceObject(Invoice invoice)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceObject));
		await invoiceOrchestrationService
			.CreateInvoiceObject(invoice)
			.ConfigureAwait(false);

		return invoice;
	}

	/// <inheritdoc/>
	public async Task<Merchant> CreateMerchantObject(Merchant merchant)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchantObject));
		await merchantOrchestrationService
			.CreateMerchantObject(merchant)
			.ConfigureAwait(false);

		return merchant;
	}

	/// <inheritdoc/>
	public async Task DeleteInvoiceObject(Guid identifier, Guid userIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceObject));
		await invoiceOrchestrationService
			.DeleteInvoiceObject(identifier, userIdentifier)
			.ConfigureAwait(false);
	}

	/// <inheritdoc/>
	public async Task DeleteMerchantObject(Guid identifier, Guid parentCompanyId)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantObject));
		await merchantOrchestrationService
			.DeleteMerchantObject(identifier, parentCompanyId)
			.ConfigureAwait(false);
	}

	/// <inheritdoc/>
	public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects()
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllInvoiceObjects));
		var invoices = await invoiceOrchestrationService
			.ReadAllInvoiceObjects()
			.ConfigureAwait(false);

		return invoices;
	}

	/// <inheritdoc/>
	public async Task<IEnumerable<Merchant>> ReadAllMerchantObjects()
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllMerchantObjects));
		var merchants = await merchantOrchestrationService
			.ReadAllMerchantObjects()
			.ConfigureAwait(false);

		return merchants;
	}

	/// <inheritdoc/>
	public async Task<Invoice> ReadInvoiceObject(Guid identifier, Guid userIdentifier)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceObject));
		var invoice = await invoiceOrchestrationService
			.ReadInvoiceObject(identifier, userIdentifier)
			.ConfigureAwait(false);

		return invoice;
	}

	/// <inheritdoc/>
	public async Task<Merchant> ReadMerchantObject(Guid identifier, Guid parentCompanyId)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantObject));
		var merchant = await merchantOrchestrationService
			.ReadMerchantObject(identifier, parentCompanyId)
			.ConfigureAwait(false);

		return merchant;
	}

	/// <inheritdoc/>
	public async Task<Invoice> UpdateInvoiceObject(Invoice currentInvoice, Invoice updatedInvoice)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceObject));
		var invoice = await invoiceOrchestrationService
			.UpdateInvoiceObject(currentInvoice, updatedInvoice)
			.ConfigureAwait(false);

		return invoice;
	}

	/// <inheritdoc/>
	public async Task<Merchant> UpdateMerchantObject(Merchant currentMerchant, Merchant updatedMerchant)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantObject));
		var merchant = await merchantOrchestrationService
			.UpdateMerchantObject(currentMerchant, updatedMerchant)
			.ConfigureAwait(false);

		return merchant;
	}
}
