using Azure.AI.FormRecognizer.DocumentAnalysis;

using Newtonsoft.Json.Linq;

using System;
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
    /// <param name="invoiceBlobUri"></param>
    /// <returns></returns>
    public Task<AnalyzeResult> SendInvoiceBlobForAnalysis(Uri invoiceBlobUri);

    /// <summary>
    /// Method that parses the invoice analysis result.
    /// This method will be called by the Invoice Analysis service.
    /// This method parses the invoice analysis result and returns a JSON object.
    /// </summary>
    /// <param name="invoiceAnalysisResult"></param>
    /// <returns></returns>
    public JObject ParseInvoiceAnalysisResult(AnalyzeResult invoiceAnalysisResult);
}