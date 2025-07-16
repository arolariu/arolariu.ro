namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// The invoice storage foundation service interface represents the foundation storage service for the invoice domain.
/// </summary>
public interface IInvoiceStorageFoundationService
{
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
	/// <returns></returns>
	public Task<Invoice> ReadInvoiceObject(Guid identifier);

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
	/// Reads all invoice objects.
	/// </summary>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid userIdentifier);

	/// <summary>
	/// Updates an invoice object.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="updatedInvoice"></param>
	/// <returns></returns>
	public Task<Invoice> UpdateInvoiceObject(Guid invoiceIdentifier, Invoice updatedInvoice);

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
	/// <returns></returns>
	public Task DeleteInvoiceObject(Guid identifier);

	/// <summary>
	/// Deletes an invoice object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task DeleteInvoiceObject(Guid identifier, Guid userIdentifier);
}
