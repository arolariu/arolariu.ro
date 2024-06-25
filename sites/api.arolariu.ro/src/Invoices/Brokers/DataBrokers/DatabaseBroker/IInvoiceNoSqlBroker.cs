namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

/// <summary>
/// The invoice NoSQL broker interface.
/// This interface is used to interact with the database.
/// This is the low level interface used to interact with the database.
/// </summary>
public interface IInvoiceNoSqlBroker
{
	#region Invoice Storage Broker

	/// <summary>
	/// Creates a new invoice.
	/// This method is used to create a new invoice in the database.
	/// </summary>
	/// <param name="invoice"></param>
	/// <returns></returns>
	public ValueTask<Invoice> CreateInvoiceAsync(Invoice invoice);

	/// <summary>
	/// Reads an invoice.
	/// This method is used to read an invoice from the database.
	/// The invoice is identified by the invoice identifier.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public ValueTask<Invoice> ReadInvoiceAsync(Guid invoiceIdentifier, Guid userIdentifier);

	/// <summary>
	/// Reads all the invoices.
	/// This method is used to read all the invoices from the database.
	/// The invoices are returned as an enumerable.
	/// </summary>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync(Guid userIdentifier);

	/// <summary>
	/// Updates an invoice.
	/// This method is used to update an invoice in the database.
	/// The invoice is identified by the invoice identifier.
	/// </summary>
	/// <param name="currentInvoice"></param>
	/// <param name="updatedInvoice"></param>
	/// <returns></returns>
	public ValueTask<Invoice> UpdateInvoiceAsync(Invoice currentInvoice, Invoice updatedInvoice);

	/// <summary>
	/// Deletes an invoice.
	/// This method is used to delete an invoice from the database.
	/// The invoice is identified by the invoice identifier.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public ValueTask DeleteInvoiceAsync(Guid invoiceIdentifier, Guid userIdentifier);
	#endregion

	#region Merchant Storage Broker

	/// <summary>
	///	Creates a new merchant.
	/// </summary>
	/// <param name="merchant"></param>
	/// <returns></returns>
	public ValueTask<Merchant> CreateMerchantAsync(Merchant merchant);

	/// <summary>
	/// Reads a merchant.
	/// </summary>
	/// <param name="merchantIdentifier"></param>
	/// <returns></returns>
	public ValueTask<Merchant> ReadMerchantAsync(Guid merchantIdentifier);

	/// <summary>
	/// Reads all the merchants.
	/// </summary>
	/// <returns></returns>
	public ValueTask<IEnumerable<Merchant>> ReadMerchantsAsync();

	/// <summary>
	/// Updates a merchant.
	/// </summary>
	/// <param name="currentMerchant"></param>
	/// <param name="updatedMerchant"></param>
	/// <returns></returns>
	public ValueTask<Merchant> UpdateMerchantAsync(Merchant currentMerchant, Merchant updatedMerchant);

	/// <summary>
	/// Deletes a merchant.
	/// </summary>
	/// <param name="merchantIdentifier"></param>
	/// <returns></returns>
	public ValueTask DeleteMerchantAsync(Guid merchantIdentifier);
	#endregion
}
