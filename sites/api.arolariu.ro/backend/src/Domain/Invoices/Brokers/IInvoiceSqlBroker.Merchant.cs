using System.Threading.Tasks;
using System;
using arolariu.Backend.Core.Domain.Invoices.Models;

namespace arolariu.Backend.Domain.Invoices.Brokers;

public partial interface IInvoiceSqlBroker
{
    #region /api/invoices/{id}/merchant endpoints
    /// <summary>
    /// Retrieves the merchant information of a specific invoice from the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <returns>A task representing the asynchronous operation with the retrieved <see cref="InvoiceMerchantInformation"/> object.</returns>
    public Task<InvoiceMerchantInformation> RetrieveMerchantInformation(Guid invoiceIdentifier);


    /// <summary>
    /// Updates the merchant information of a specific invoice in the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <param name="merchantInformation">The updated <see cref="InvoiceMerchantInformation"/> object.</param>
    /// <returns>A task representing the asynchronous operation indicating whether the update was successful.</returns>
    public Task<bool> UpdateMerchantInformation(Guid invoiceIdentifier, InvoiceMerchantInformation merchantInformation);


    /// <summary>
    /// Deletes the merchant information of a specific invoice from the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <returns>A task representing the asynchronous operation indicating whether the deletion was successful.</returns>
    public Task<bool> DeleteMerchantInformation(Guid invoiceIdentifier);
    #endregion
}
