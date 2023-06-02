using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json.Serialization;

namespace ContainerBackend.Domain.Invoices.DTOs
{
    /// <summary>
    /// The posted invoice DTO, this is the invoice that is posted to the database.
    /// </summary>
    [Serializable]
    public class PostedInvoiceDto
    {
        /// <summary>
        /// The invoice id.
        /// This is the id that is used to identify the invoice in the database.
        /// </summary>
        public Guid InvoiceId { get; set; } = Guid.NewGuid();

        /// <summary>
        /// The invoice base 64 photo.
        /// E.g. : data:image/jpeg;base64,/9.........
        /// </summary>
        public required string InvoiceBase64Photo { get; set; } = string.Empty;

        /// <summary>
        /// Additional invoice metadata to be processed.
        /// The metadata will be stored in the database as a JSON field.
        /// </summary>
        public required IDictionary<string, string> AdditionalMetadata { get; set; } = new Dictionary<string, string>();

        /// <summary>
        /// Method that converts the base 64 representation of the invoice image to a <see cref="IFormFile"/> object.
        /// </summary>
        /// <returns></returns>
        public IFormFile ConvertToFormFile()
        {
            var splittedBase64String = InvoiceBase64Photo.Split(";base64,");
            var base64String = splittedBase64String[1];
            var contentType = splittedBase64String[0].Split(":")[1];
            var splittedContentType = contentType.Split("/");
            var fileType = splittedContentType[0];
            var fileExtension = splittedContentType[1];
            var array = Convert.FromBase64String(base64String);
            var stream = new MemoryStream(array) { Position = 0};
            return new FormFile(stream, 0, stream.Length,
                fileType, $"InvoiceImage.{fileExtension}")
            {
                Headers = new HeaderDictionary(),
                ContentType = contentType,
            };
        }
    }
}
