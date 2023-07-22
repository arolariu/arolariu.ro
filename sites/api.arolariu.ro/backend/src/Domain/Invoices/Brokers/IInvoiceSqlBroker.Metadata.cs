﻿using System.Threading.Tasks;
using System;
using arolariu.Backend.Core.Domain.Invoices.Models;

namespace arolariu.Backend.Core.Domain.Invoices.Brokers;


public partial interface IInvoiceSqlBroker
{
    #region /api/invoices/{id}/metadata endpoints
    /// <summary>
    /// Retrieves the metadata of a specific invoice from the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <returns>A task representing the asynchronous operation with the retrieved invoice metadata object.</returns>
    public ValueTask<InvoiceMetadata> RetrieveSpecificInvoiceMetadata(Guid invoiceIdentifier);

    /// <summary>
    /// Updates the metadata of a specific invoice in the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <param name="key"></param>
    /// <param name="value"></param>
    /// <returns>A task representing the asynchronous operation indicating whether the update was successful or not.</returns>
    public ValueTask<bool> UpdateSpecificInvoiceMetadata(Guid invoiceIdentifier, string key, object value);


    /// <summary>
    /// Deletes a specific metadata entry associated with an invoice in the SQL database asynchronously.
    /// </summary>
    /// <param name="invoiceIdentifier">The unique identifier of the invoice.</param>
    /// <param name="metadataKey">The key of the metadata entry to delete.</param>
    /// <returns>A task representing the asynchronous operation indicating whether the deletion was successful or not.</returns>
    public ValueTask<bool> DeleteSpecificInvoiceMetadata(Guid invoiceIdentifier, string metadataKey);
    #endregion
}
