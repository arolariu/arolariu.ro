using arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceSqlBroker
{
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
        /// <param name="invoice"></param>
        /// <returns></returns>
        public ValueTask CreateInvoiceAsync(Invoice invoice);

        /// <summary>
        /// Reads an invoice.
        /// This method is used to read an invoice from the database.
        /// The invoice is identified by the invoice identifier.
        /// </summary>
        /// <param name="invoiceIdentifier"></param>
        /// <returns></returns>
        public ValueTask<Invoice> ReadInvoiceAsync(Guid invoiceIdentifier);

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
        /// <param name="invoice"></param>
        /// <returns></returns>
        public ValueTask<Invoice> UpdateInvoiceAsync(Invoice invoice);

        /// <summary>
        /// Deletes an invoice.
        /// This method is used to delete an invoice from the database.
        /// The invoice is identified by the invoice identifier.
        /// </summary>
        /// <param name="invoiceIdentifier"></param>
        /// <returns></returns>
        public ValueTask DeleteInvoiceAsync(Guid invoiceIdentifier);
    }
}
