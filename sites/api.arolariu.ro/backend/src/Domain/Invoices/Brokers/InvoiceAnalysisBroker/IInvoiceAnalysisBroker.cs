using arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

using Azure.AI.FormRecognizer.DocumentAnalysis;

using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceAnalysisBroker
{
    /// <summary>
    /// The invoice analysis broker interface represents the contract for the invoice analysis operations.
    /// The invoice analysis service is used to analyze the invoice and extract the invoice items and the merchant information.
    /// This interface is used to interact with the invoice analysis service.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    public interface IInvoiceAnalysisBroker<T> where T: class
    {
        /// <summary>
        /// Sends the invoice to analysis.
        /// </summary>
        /// <param name="invoice"></param>
        /// <returns></returns>
        public ValueTask<T> SendInvoiceToAnalysisAsync(Invoice invoice);

        /// <summary>
        /// Populates the invoice with the analysis result.
        /// </summary>
        /// <param name="invoice"></param>
        /// <param name="analyzedInvoiceResult"></param>
        /// <returns></returns>
        public ValueTask<Invoice> PopulateInvoiceWithAnalysisResultAsync(Invoice invoice, T analyzedInvoiceResult);

        /// <summary>
        /// Retrieves the invoice items from the analysis result.
        /// </summary>
        /// <param name="analyzedInvoiceResult"></param>
        /// <returns></returns>
        public ValueTask<IEnumerable<InvoiceItem>> RetrieveInvoiceItemsFromAnalysisResultAsync(T analyzedInvoiceResult);

        /// <summary>
        /// Retrieves the merchant information from the analysis result.
        /// </summary>
        /// <param name="analyzedInvoiceResult"></param>
        /// <returns></returns>
        public ValueTask<InvoiceMerchant> RetrieveMerchantInformationFromAnalysisResultAsync(T analyzedInvoiceResult);
    }
}
