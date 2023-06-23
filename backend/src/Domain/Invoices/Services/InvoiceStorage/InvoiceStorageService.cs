using arolariu.Backend.Domain.General.Services.KeyVault;
using arolariu.Backend.Domain.Invoices.Models;

using Azure.Storage.Blobs;

using Microsoft.AspNetCore.Http;

using System;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.InvoiceStorage;

/// <summary>
/// Service that stores an invoice blob to an Azure Blob Storage container.
/// </summary>
public class InvoiceStorageService : IInvoiceStorageService
{
    private readonly BlobContainerClient blobStorageBroker;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="keyVaultService"></param>
    public InvoiceStorageService(IKeyVaultService keyVaultService)
    {
        var connString = keyVaultService.GetSecret("arolariu-storage-connstring");
        blobStorageBroker = new BlobContainerClient(connString, "invoices");
        blobStorageBroker.CreateIfNotExists();
    }

    /// <summary>
    /// to complete.
    /// </summary>
    /// <param name="invoiceIdentifier"></param>
    /// <returns></returns>
    /// <exception cref="NotImplementedException"></exception>
    public Task<IFormFile> RetrieveInvoicePhotoFromBlobStorage(Guid invoiceIdentifier)
    {
        throw new NotImplementedException();
    }

    /// <inheritdoc/>
    public async Task<Uri> UploadInvoicePhotoToBlobStorage(Invoice invoice)
    {
        // upload blob
        var blobName = invoice.InvoiceId.ToString() + ".jpg";
        var blobClient = blobStorageBroker.GetBlobClient(blobName);

        using var stream = invoice.InvoiceImage.OpenReadStream();
        
        await blobClient.UploadAsync(stream, overwrite: true);
        invoice.InvoiceImageURI = blobClient.Uri;
        
        return blobClient.Uri;
    }

}
