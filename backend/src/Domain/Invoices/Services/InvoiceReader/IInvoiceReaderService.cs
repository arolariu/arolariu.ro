using arolariu.Backend.Domain.Invoices.Models;

using Azure.AI.FormRecognizer.DocumentAnalysis;

using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.InvoiceReader;

/// <summary>
/// Interface that defines the invoice reader service contract.
/// This interface is used by the <see cref="InvoiceReaderService"/> class.
/// </summary>
public interface IInvoiceReaderService
{
    /// <summary>
    /// Send an invoice for analysis to the Azure Cognitive Services service.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns></returns>
    public Task<AnalyzedDocument> SendInvoiceToCognitiveServices(Invoice invoice);

    /// <summary>
    /// Update the invoice with the analyzed data.
    /// </summary>
    /// <param name="invoice"></param>
    /// <param name="receipt"></param>
    /// <returns></returns>
    public Invoice UpdateInvoiceWithAnalyzedData(Invoice invoice, AnalyzedDocument receipt);
}