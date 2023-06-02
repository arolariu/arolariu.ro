using ContainerBackend.Domain.Invoices.DTOs;
using Microsoft.AspNetCore.Http;
using System;

namespace ContainerBackend.Domain.Invoices.Services.InvoiceStorage
{
    /// <summary>
    /// Interface that defines the invoice storage service contract.
    /// </summary>
    public interface IInvoiceStorageService
    {
        /// <summary>
        /// Upload a blob image (invoice data) to an Azure Blob Storage container.
        /// </summary>
        /// <param name="invoice"></param>
        /// <returns><see cref="Uri"/> object that contains the path to the uploaded blob object.</returns>
        public Uri UploadInvoiceBlobToBlobStorage(PostedInvoiceDto invoice);
    }
}