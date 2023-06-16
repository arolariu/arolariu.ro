using arolariu.Backend.Domain.Invoices.Models;

using System;
using System.Data;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Brokers;

/// <summary>
/// Interface that defines the invoice SQL broker contract.
/// This interface is used by the <see cref="InvoiceSqlBroker"/> class.
/// </summary>
public interface IInvoiceSqlBroker
{
    /// <summary>
    /// Gets the database connection used by the invoice SQL broker.
    /// </summary>
    public IDbConnection DbConnection { get; }

    /// <summary>
    /// Creates an invoice entry in the SQL database asynchronously.
    /// </summary>
    /// <param name="invoice">The invoice object to be created.</param>
    /// <returns>A task representing the asynchronous operation with the number of affected rows.</returns>
    public Task<int> CreateInvoiceAsync(Invoice invoice);

    /// <summary>
    /// Reads an invoice from the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <returns>A task representing the asynchronous operation with the retrieved invoice object.</returns>
    public Task<Invoice> ReadInvoiceAsync(Guid invoiceIdentifier);
}
