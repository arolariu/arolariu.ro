namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// The invoice orchestration service interface represents the orchestration service for the invoice domain.
/// </summary>
public interface IInvoiceOrchestrationService
{
	/// <summary>
	/// Analyze an invoice.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <param name="options"></param>
	/// <returns></returns>
	public Task AnalyzeInvoiceWithOptions(AnalysisOptions options, Guid invoiceIdentifier, Guid? userIdentifier = null);

	#region Implements the Invoice Storage Foundation Service
	#region Create Invoice API
	/// <summary>
	/// Creates an invoice object.
	/// </summary>
	/// <param name="invoice"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<Invoice> CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null);
	#endregion

	#region Read Invoice API
	/// <summary>
	/// Reads an invoice object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier = null);
	#endregion

	#region Read Invoices API
	/// <summary>
	/// Reads all invoice objects.
	/// </summary>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid? userIdentifier = null);
	#endregion

	#region Update Invoice API
	/// <summary>
	/// Updates an invoice object.
	/// </summary>
	/// <param name="updatedInvoice"></param>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<Invoice> UpdateInvoiceObject(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Delete Invoice API
	/// <summary>
	/// Deletes an invoice object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task DeleteInvoiceObject(Guid identifier, Guid? userIdentifier = null);
	#endregion
	#endregion
}
