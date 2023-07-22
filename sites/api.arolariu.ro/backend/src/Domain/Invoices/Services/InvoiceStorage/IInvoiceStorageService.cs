using arolariu.Backend.Core.Domain.Invoices.Models;

using Microsoft.AspNetCore.Http;

using System;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Services.InvoiceStorage;

/// <summary>
/// Interface that defines the invoice storage service contract.
/// This interface is used by the <see cref="InvoiceStorageService"/> class.
/// </summary>
public interface IInvoiceStorageService
{
    /// <summary>
    /// Upload a blob image (invoice photo) to an Azure Blob Storage container.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns><see cref="Uri"/> object that contains the path to the uploaded blob object.</returns>
    public ValueTask<Uri> UploadInvoicePhotoToBlobStorage(Invoice invoice);

    /// <summary>
    /// Retrieve a blob image (invoice photo) from an Azure Blob Storage container.
    /// </summary>
    /// <param name="invoiceIdentifier"></param>
    /// <returns></returns>
    public ValueTask<IFormFile> RetrieveInvoicePhotoFromBlobStorage(Guid invoiceIdentifier);
}