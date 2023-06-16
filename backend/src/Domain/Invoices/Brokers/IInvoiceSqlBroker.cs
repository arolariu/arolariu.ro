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
    /// The database connection.
    /// </summary>
    public IDbConnection DbConnection { get; }

    /// <summary>
    /// Create an invoice entry in the SQL database.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns></returns>
    public Task<int> CreateInvoiceAsync(Invoice invoice);

    /// <summary>
    /// Read an invoice from the SQL database.
    /// </summary>
    /// <param name="invoiceIdentifier"></param>
    /// <returns></returns>
    public Task<Invoice> ReadInvoiceAsync(Guid invoiceIdentifier);
}
