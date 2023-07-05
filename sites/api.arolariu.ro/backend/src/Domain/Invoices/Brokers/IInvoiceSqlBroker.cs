using arolariu.Backend.Core.Domain.Invoices.Brokers;
using arolariu.Backend.Core.Domain.Invoices.Models;

using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Brokers;

/// <summary>
/// Interface that defines the invoice SQL broker contract.
/// This interface is used by the <see cref="InvoiceSqlBroker"/> class.
/// </summary>
public partial interface IInvoiceSqlBroker
{
    /// <summary>
    /// Gets the database connection used by the invoice SQL broker.
    /// </summary>
    public IDbConnection DbConnection { get; }

    #region /api/invoices domain endpoints
    /// <summary>
    /// Retrieves all invoices from the SQL database asynchronously.
    /// </summary>
    /// <returns>A task representing the asynchronous operation with the collection of retrieved invoices.</returns>
    public Task<IEnumerable<Invoice>> RetrieveAllInvoices();


    /// <summary>
    /// Inserts a new invoice into the SQL database asynchronously.
    /// </summary>
    /// <param name="invoice">The invoice object to be inserted.</param>
    /// <returns>A task representing the asynchronous operation, returning a boolean indicating the success of the insertion.</returns>
    public Task<bool> InsertNewInvoice(Invoice invoice);


    /// <summary>
    /// Reads an invoice from the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <returns>A task representing the asynchronous operation with the retrieved invoice object.</returns>
    public Task<Invoice> RetrieveSpecificInvoice(Guid invoiceIdentifier);


    /// <summary>
    /// Updates a specific invoice in the SQL database asynchronously.
    /// </summary>
    /// <param name="invoice">The updated invoice object.</param>
    /// <returns>A task representing the asynchronous operation with the updated invoice object.</returns>
    public Task<Invoice> UpdateSpecificInvoice(Invoice invoice);


    /// <summary>
    /// Deletes a specific invoice from the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice to be deleted.</param>
    /// <returns>A task representing the asynchronous operation. Returns `true` if the invoice was successfully deleted, or `false` otherwise.</returns>
    public Task<bool> DeleteSpecificInvoice(Guid invoiceIdentifier);

    #endregion

    #region /api/invoices/{id}/items
    /// <summary>
    /// Retrieves the items information for a specific invoice from the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <returns>A task representing the asynchronous operation with the retrieved <see cref="InvoiceItemsInformation"/> object containing the items information.</returns>
    public Task<InvoiceItemsInformation> RetrieveInvoiceItems(Guid invoiceIdentifier);

    /// <summary>
    /// Updates the items information of an invoice in the database.
    /// </summary>
    /// <param name="invoiceIdentifier">The identifier of the invoice.</param>
    /// <param name="invoiceItemsInformation">The updated invoice items information.</param>
    /// <returns>A task representing the asynchronous operation indicating whether the update was successful.</returns>
    public Task<bool> UpdateInvoiceItems(Guid invoiceIdentifier, InvoiceItemsInformation invoiceItemsInformation);

    /// <summary>
    /// Deletes the items information for a specific invoice from the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <returns>A task representing the asynchronous operation. Returns <c>true</c> if the deletion was successful; otherwise, <c>false</c>.</returns>
    public Task<bool> DeleteInvoiceItems(Guid invoiceIdentifier);
    #endregion

    #region /api/invoices/{id}/status
    /// <summary>
    /// Retrieves the status of a specific invoice from the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <returns>A task representing the asynchronous operation with the retrieved <see cref="InvoiceStatus"/> object.</returns>
    public Task<InvoiceStatus> RetrieveInvoiceStatus(Guid invoiceIdentifier);

    /// <summary>
    /// Updates the status of an invoice in the database.
    /// </summary>
    /// <param name="invoice">The invoice object.</param>
    /// <param name="invoiceStatus">The updated invoice status.</param>
    /// <returns>A task representing the asynchronous operation with the updated invoice status.</returns>
    public Task<bool> UpdateInvoiceStatus(Invoice invoice, InvoiceStatus invoiceStatus);
    #endregion
}
