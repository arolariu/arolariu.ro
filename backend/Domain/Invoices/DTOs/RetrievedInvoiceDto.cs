using System;

namespace ContainerBackend.Domain.Invoices.DTOs
{
    /// <summary>
    /// The retrieved invoice DTO, this is the invoice that is retrieved from the database.
    /// </summary>
    [Serializable]
    public class RetrievedInvoiceDto
    {
        /// <summary>
        /// The invoice id.
        /// </summary>
        public required Guid InvoiceId { get; set; }

        /// <summary>
        /// This is the retrieved compressed image of the invoice.
        /// </summary>
        public required byte[] CompressedInvoiceBlobImage { get; set; }
    }
}
