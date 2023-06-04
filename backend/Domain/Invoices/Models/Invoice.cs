using System;
using System.Collections;
using System.Collections.Generic;

namespace arolariu.Backend.Domain.Invoices.Models
{
    /// <summary>
    /// The Invoice model as "partially-stored" in the SQL database.
    /// </summary>
    [Serializable]
    public class Invoice
    {
        /// <summary>
        /// The invoice id.
        /// </summary>
        public required Guid InvoiceId { get; set; } = Guid.NewGuid();

        /// <summary>
        /// The invoice submitted date. (not to be confused with the invoice recognized date (OCR).)
        /// </summary>
        public required DateTime InvoiceSubmittedDate { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// The byte array of the invoice image.
        /// </summary>
        public required byte[] InvoiceBlobImage { get; set; }
    }
}
