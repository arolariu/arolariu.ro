using System;

namespace arolariu.Backend.Domain.Invoices.DTOs
{
    /// <summary>
    /// The retrieved invoice DTO from the database.
    /// </summary>
    public class RetrievedInvoiceDto
    {
        /// <summary>
        /// The retried invoice id.
        /// </summary>
        public Guid InvoiceId { get; set; } = Guid.NewGuid();

        /// <summary>
        /// The retrieved (compressed) invoice image.
        /// </summary>
        public string InvoiceImage { get; set; } = string.Empty;

        /// <summary>
        /// The retrieved invoice total cost, in $USD currency.
        /// </summary>
        public double InvoiceTotalCost { get; set; } = 0.0;

        /// <summary>
        /// The retrieved invoice total calories.
        /// </summary>
        public double InvoiceTotalCalories { get; set; } = 0.0;

        /// <summary>
        /// Additional invoice metadata that was stored.
        /// </summary>
        public string InvoiceMetadata { get; set; } = string.Empty;
    }
}
