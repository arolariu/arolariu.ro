using Azure.Storage.Blobs;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Brokers.InvoicePhotoStorageBroker;

/// <summary>
/// The <see cref="InvoiceAzureStorageBroker"/> class implements the <see cref="IInvoiceStorageBroker"/> interface.
/// This class uses the Azure Blob Storage service to store the invoice photos.
/// The invoice photo is stored as a blob in the Azure Blob Storage service.
/// </summary>
public class InvoiceAzureStorageBroker : IInvoiceStorageBroker
{
    private readonly BlobContainerClient blobContainerClient;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="configuration"></param>
    public InvoiceAzureStorageBroker(IConfiguration configuration)
    {
        if (configuration is not null)
        {
            var connString = configuration["Azure:Storage:ConnectionString"]
                ?? throw new ArgumentNullException(nameof(configuration));

            blobContainerClient = new BlobContainerClient(connString, "invoices");
            blobContainerClient.CreateIfNotExists();
        }
        else throw new ArgumentNullException(nameof(configuration));
    }

    /// <inheritdoc/>
    public async Task<IFormFile> RetrieveInvoicePhotoFromStorage(Uri photoLocation)
    {
        using var httpClient = new HttpClient();
        using var response = await httpClient
            .GetAsync(photoLocation)
            .ConfigureAwait(false);

        using var content = await response.Content
            .ReadAsStreamAsync()
            .ConfigureAwait(false);

        var photoName = photoLocation.ToString().Split('/')[^1];
        return new FormFile(content, 0, content.Length, photoName, photoName);
    }

    /// <inheritdoc/>
    public async Task<Uri> UploadInvoicePhotoToStorage(string base64InvoicePhoto, Guid photoIdentifier)
    {
        var isValid = await ValidateBase64PhotoRepresentation(base64InvoicePhoto)
            .ConfigureAwait(false);

        if (isValid)
        {
            var photoExtension = base64InvoicePhoto.Substring(base64InvoicePhoto.IndexOf('/') + 1, base64InvoicePhoto.IndexOf(';') - base64InvoicePhoto.IndexOf('/') - 1);
            var photoName = photoIdentifier.ToString() + "." + photoExtension;

            var blobClient = blobContainerClient.GetBlobClient(photoName);
            var photoBytes = Convert.FromBase64String(base64InvoicePhoto.Substring(base64InvoicePhoto.IndexOf(',') + 1));

            await blobClient
                .UploadAsync(new MemoryStream(photoBytes))
                .ConfigureAwait(false);

            return blobClient.Uri;
        }
        else
        {
            throw new ArgumentException("The base64 representation of the invoice photo is not valid.");
        }
    }

    /// <inheritdoc/>
    public ValueTask<bool> ValidateBase64PhotoRepresentation(string base64PhotoRepresentation)
    {
        var photoExtension = base64PhotoRepresentation.Substring(base64PhotoRepresentation.IndexOf('/') + 1, base64PhotoRepresentation.IndexOf(';') - base64PhotoRepresentation.IndexOf('/') - 1);
        var photoBytes = Convert.FromBase64String(base64PhotoRepresentation.Substring(base64PhotoRepresentation.IndexOf(',') + 1));

        if (photoExtension == "png" ||
            photoExtension == "jpg" ||
            photoExtension == "pdf" ||
            photoExtension == "jpeg")
        {
            // if photo bytes > 0 and < 10 MB
            if (photoBytes.Length > 0 && photoBytes.Length < 10_000_000)
            {
                return new ValueTask<bool>(true);
            }
            else
            {
                throw new ArgumentException("The base64 representation of the invoice photo is either NULL or > 10MB.");
            }
        }
        else
        {
            throw new ArgumentException("The base64 representation extension is not permitted. Allowed values: png,jpg,pdf.");
        }
    }
}
