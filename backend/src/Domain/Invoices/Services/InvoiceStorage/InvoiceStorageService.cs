using arolariu.Backend.Domain.General.Services.KeyVault;
using arolariu.Backend.Domain.Invoices.DTOs;

using Azure.Storage.Blobs;

using System;

namespace arolariu.Backend.Domain.Invoices.Services.InvoiceStorage;

/// <summary>
/// Service that stores an invoice blob to an Azure Blob Storage container.
/// </summary>
public class InvoiceStorageService : IInvoiceStorageService
{
    private readonly IKeyVaultService keyVaultService;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="keyVaultService"></param>
    public InvoiceStorageService(IKeyVaultService keyVaultService)
    {
        this.keyVaultService = keyVaultService ?? throw new ArgumentNullException(nameof(keyVaultService));
    }

    /// <inheritdoc/>
    public Uri UploadInvoiceBlobToBlobStorage(PostedInvoiceDto invoice)
    {
        // create blob container client
        var connectionString = keyVaultService.GetSecret("arolariu-storage-connstring");
        var blobContainerClient = new BlobContainerClient(connectionString, "invoices");
        blobContainerClient.CreateIfNotExists();

        // upload blob
        var blobName = invoice.InvoiceId.ToString();
        var blobClient = blobContainerClient.GetBlobClient(blobName);

        var photo = PostedInvoiceDto.ConvertToFormFile(invoice);
        using var stream = photo.OpenReadStream();
        blobClient.Upload(stream, overwrite: true);
        return blobClient.Uri;
    }
}
