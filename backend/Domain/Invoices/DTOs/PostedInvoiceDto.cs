using System;

namespace ContainerBackend.Domain.Invoices.DTOs
{
    /// <summary>
    /// DTO for the received invoice via the HTTP POST request.
    /// </summary>
    [Serializable]
    public class PostedInvoiceDto
    {
        /// <summary>
        /// The invoice id.
        /// </summary>
        public required Guid InvoiceId { get; set; } = Guid.NewGuid();

        /// <summary>
        /// The byte array of the invoice image.
        /// </summary>
        public required byte[] InvoiceBlobImage { get; set; }

        /// <summary>
        /// The invoice submitted date. (not to be confused with the invoice recognized date (OCR).)
        /// </summary>
        public required DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    }
}
