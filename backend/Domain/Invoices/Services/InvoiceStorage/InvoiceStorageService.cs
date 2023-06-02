using Azure.Storage.Blobs;
using ContainerBackend.Domain.General.Services.KeyVault;
using ContainerBackend.Domain.Invoices.DTOs;
using Microsoft.AspNetCore.Http;
using System;
using System.IO;
using System.Text;

namespace ContainerBackend.Domain.Invoices.Services.InvoiceStorage
{
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
            this.keyVaultService = keyVaultService;
        }

        /// <inheritdoc/>
        public Uri UploadInvoiceBlobToBlobStorage(PostedInvoiceDto invoice)
        {
            // create blob container client
            var blobContainerClient = new BlobContainerClient(
                keyVaultService.GetSecret("arolariu-storage-connstring"),
                "invoices");
            blobContainerClient.CreateIfNotExists();

            // upload blob
            var blobName = invoice.InvoiceId.ToString();
            var blobClient = blobContainerClient.GetBlobClient(blobName);

            var photo = invoice.ConvertToFormFile();
            using var stream = photo.OpenReadStream();
            blobClient.Upload(stream, overwrite: true);
            return blobClient.Uri;
        }
    }
}
