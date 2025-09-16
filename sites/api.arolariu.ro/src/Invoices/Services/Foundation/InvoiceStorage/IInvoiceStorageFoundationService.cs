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
	#region Store Invoice Object API
	/// <summary>
	/// Creates an invoice object.
	/// </summary>
	/// <param name="invoice"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null);
	#endregion

	#region Read Invoice Object API
	/// <summary>
	/// Reads an invoice object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier = null);
	#endregion

	#region Read Invoice Objects API
	/// <summary>
	/// Reads all invoice objects.
	/// </summary>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid? userIdentifier = null);
	#endregion

	#region Update Invoice Object API
	/// <summary>
	/// Updates an invoice object.
	/// </summary>
	/// <param name="updatedInvoice"></param>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<Invoice> UpdateInvoiceObject(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Delete Invoice Object API
	/// <summary>
	/// Deletes an invoice object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task DeleteInvoiceObject(Guid identifier, Guid? userIdentifier = null);
	#endregion
}
