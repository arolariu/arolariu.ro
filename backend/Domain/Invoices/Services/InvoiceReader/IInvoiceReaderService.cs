using Azure.AI.FormRecognizer.DocumentAnalysis;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.InvoiceReader
{
    /// <summary>
    /// Interface that defines the invoice reader service contract.
    /// </summary>
    public interface IInvoiceReaderService
    {
        /// <summary>
        /// Send an invoice for analysis to the Azure Cognitive Services service.
        /// </summary>
        /// <param name="invoiceBlobUri"></param>
        /// <returns></returns>
        public Task<IReadOnlyList<DocumentTable>> SendInvoiceForAnalysis(Uri invoiceBlobUri);
    }
}