using System;

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
        /// The invoice image URI.
        /// </summary>
        public required Uri InvoiceImageBlobUri { get; set; }

        /// <summary>
        /// The invoice items.
        /// </summary>
        public required InvoiceItemsInformation InvoiceItems { get; set; } = new InvoiceItemsInformation();

        /// <summary>
        /// The invoice merchant information.
        /// </summary>
        public required InvoiceMerchantInformation MerchantInformation { get; set; } = new InvoiceMerchantInformation();

        /// <summary>
        /// The invoice time information.
        /// </summary>
        public required InvoiceTimeInformation InvoiceTime { get; set; } = new InvoiceTimeInformation();

        /// <summary>
        /// The invoice transaction information.
        /// </summary>
        public required InvoiceTransactionInformation TransactionInformation { get; set; } = new InvoiceTransactionInformation();

        /// <summary>
        /// Null object pattern for the invoice model.
        /// </summary>
        /// <returns></returns>
        internal static Invoice CreateNullInvoice()
        {
            return new Invoice()
            {
                InvoiceId = Guid.Empty,
                InvoiceImageBlobUri = null!,
                InvoiceTime = InvoiceTimeInformation.CreateNullInvoiceTimeInformation(),
                InvoiceItems = InvoiceItemsInformation.CreateNullInvoiceItemsInformation(),
                MerchantInformation = InvoiceMerchantInformation.CreateNullInvoiceMerchantInformation(),
                TransactionInformation = InvoiceTransactionInformation.CreateNullInvoiceTransactionInformation()
            };
        }
    }
}
