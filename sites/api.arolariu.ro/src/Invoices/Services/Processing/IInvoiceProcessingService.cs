namespace arolariu.Backend.Domain.Invoices.Services.Processing;
using arolariu.Backend.Domain.Invoices.DTOs;
using System.Threading.Tasks;
using System;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using System.Collections.Generic;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// This interface represents the invoice processing service.
/// </summary>
public interface IInvoiceProcessingService
{
	#region Invoice Orchestration Service
	/// <summary>
	/// Analyze an invoice.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <param name="options"></param>
	/// <returns></returns>
	public Task AnalyzeInvoiceWithOptions(
		Guid invoiceIdentifier,
		Guid userIdentifier,
		AnalysisOptions options);

	/// <summary>
	/// Creates an invoice object.
	/// </summary>
	/// <param name="invoice"></param>
	/// <returns></returns>
	public Task<Invoice> CreateInvoiceObject(Invoice invoice);

	/// <summary>
	/// Reads an invoice object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<Invoice> ReadInvoiceObject(Guid identifier, Guid userIdentifier);

	/// <summary>
	/// Reads all invoice objects.
	/// </summary>
	/// <returns></returns>
	public Task<IEnumerable<Invoice>> ReadAllInvoiceObjects();

	/// <summary>
	/// Updates an invoice object.
	/// </summary>
	/// <param name="currentInvoice"></param>
	/// <param name="updatedInvoice"></param>
	/// <returns></returns>
	public Task<Invoice> UpdateInvoiceObject(Invoice currentInvoice, Invoice updatedInvoice);

	/// <summary>
	/// Deletes an invoice object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task DeleteInvoiceObject(Guid identifier, Guid userIdentifier);
	#endregion

	#region Merchant Orchestration Service
	/// <summary>
	/// Creates a merchant object.
	/// </summary>
	/// <param name="merchant"></param>
	/// <returns></returns>
	public Task<Merchant> CreateMerchantObject(Merchant merchant);

	/// <summary>
	/// Reads a merchant object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task<Merchant> ReadMerchantObject(Guid identifier, Guid parentCompanyId);

	/// <summary>
	/// Reads all merchant objects.
	/// </summary>
	/// <returns></returns>
	public Task<IEnumerable<Merchant>> ReadAllMerchantObjects();

	/// <summary>
	/// Updates a merchant object.
	/// </summary>
	/// <param name="currentMerchant"></param>
	/// <param name="updatedMerchant"></param>
	/// <returns></returns>
	public Task<Merchant> UpdateMerchantObject(Merchant currentMerchant, Merchant updatedMerchant);

	/// <summary>
	/// Deletes a merchant object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task DeleteMerchantObject(Guid identifier, Guid parentCompanyId);
	#endregion

}
