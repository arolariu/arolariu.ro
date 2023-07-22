using System.Threading.Tasks;
using System;
using arolariu.Backend.Core.Domain.Invoices.Models;

namespace arolariu.Backend.Core.Domain.Invoices.Brokers;

public partial interface IInvoiceSqlBroker
{
    #region /api/invoices/{id}/time endpoints
    /// <summary>
    /// Retrieves the time information associated with an invoice from the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <returns>A task representing the asynchronous operation with the retrieved time information of the invoice.</returns>
    public ValueTask<InvoiceTimeInformation> RetrieveTimeInformation(Guid invoiceIdentifier);

    /// <summary>
    /// Updates the time information associated with an invoice in the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <param name="timeInformation">The updated time information of the invoice.</param>
    /// <returns>A task representing the asynchronous operation indicating whether the update was successful or not.</returns>
    public ValueTask<bool> UpdateTimeInformation(Guid invoiceIdentifier, InvoiceTimeInformation timeInformation);

    /// <summary>
    /// Deletes the time information associated with an invoice from the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <returns>A task representing the asynchronous operation indicating whether the deletion was successful or not.</returns>
    public ValueTask<bool> DeleteTimeInformation(Guid invoiceIdentifier);
    #endregion
}
