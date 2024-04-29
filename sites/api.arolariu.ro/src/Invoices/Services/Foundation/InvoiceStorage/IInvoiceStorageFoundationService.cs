namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

/// <summary>
/// The invoice storage foundation service interface represents the foundation storage service for the invoice domain.
/// </summary>
public interface IInvoiceStorageFoundationService
{
	/// <summary>
	/// Creates an invoice object.
	/// </summary>
	/// <param name="invoiceDto"></param>
	/// <returns></returns>
	public Task<Invoice> CreateInvoiceObject(CreateInvoiceDto invoiceDto);

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
}
