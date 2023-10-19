using Microsoft.AspNetCore.Http;

using System;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Brokers.InvoicePhotoStorageBroker
{
    /// <summary>
    /// This interface is used to interact with the invoice photo storage.
    /// The invoice photo storage is used to store the invoice photos.
    /// Currently, we accept base64 encoded photos that are either JPG, PNG or PDF.
    /// </summary>
    public interface IInvoiceStorageBroker
    {
        /// <summary>
        /// Uploads the invoice photo to the storage service.
        /// </summary>
        /// <param name="base64InvoicePhoto"></param>
        /// <param name="photoIdentifier"></param>
        /// <returns></returns>
        public Task<Uri> UploadInvoicePhotoToStorage(string base64InvoicePhoto, Guid photoIdentifier);

        /// <summary>
        /// Retrieves the invoice photo from the storage service.
        /// The invoice photo is returned as a <see cref="FormFile"/> object.
        /// The <see cref="FormFile"/> object can be used to create a <see cref="System.Drawing.Image"/> object.
        /// </summary>
        /// <param name="photoLocation"></param>
        /// <returns></returns>
        public Task<IFormFile> RetrieveInvoicePhotoFromStorage(Uri photoLocation);

        /// <summary>
        /// This method validates the base64 photo representation.
        /// The base64 photo representation is valid if it is a JPG, PNG or PDF.
        /// If the base64 photo representation is valid, the method returns true.
        /// </summary>
        /// <param name="base64PhotoRepresentation"></param>
        /// <returns></returns>
        public ValueTask<bool> ValidateBase64PhotoRepresentation(string base64PhotoRepresentation);
    }
}
