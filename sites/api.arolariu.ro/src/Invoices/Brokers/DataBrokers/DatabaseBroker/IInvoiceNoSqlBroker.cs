using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;

/// <summary>
/// The invoice NoSQL broker interface.
/// This interface is used to interact with the database.
/// This is the low level interface used to interact with the database.
/// </summary>
public interface IInvoiceNoSqlBroker
{
    /// <summary>
    /// Creates a new invoice.
    /// This method is used to create a new invoice in the database.
    /// </summary>
    /// <param name="invoiceDto"></param>
    /// <returns></returns>
    public ValueTask<Invoice> CreateInvoiceAsync(CreateInvoiceDto invoiceDto);

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
    /// <returns></returns>
    public ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync();

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
}
