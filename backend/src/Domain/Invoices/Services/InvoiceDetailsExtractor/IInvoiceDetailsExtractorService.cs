using arolariu.Backend.Domain.Invoices.Models;

using Azure.AI.FormRecognizer.DocumentAnalysis;

namespace arolariu.Backend.Domain.Invoices.Services.InvoiceDetailsExtractor;

/// <summary>
/// Interface that defines the invoice extractor service contract.
/// </summary>
public interface IInvoiceDetailsExtractorService
{
    /// <summary>
    /// Method that extracts the invoice transaction information from the invoice.
    /// The transaction information is stored in the <see cref="InvoiceTransactionInformation"/> record struct.
    /// </summary>
    /// <param name="receipt"></param>
    /// <returns></returns>
    public InvoiceTransactionInformation ExtractInvoiceTransactionInformation(AnalyzedDocument receipt);

    /// <summary>
    /// Method that extracts the invoice items information from the invoice.
    /// The items information is stored in the <see cref="InvoiceItemsInformation"/> record struct.
    /// </summary>
    /// <param name="receipt"></param>
    /// <returns></returns>
    public InvoiceItemsInformation ExtractInvoiceItemsInformation(AnalyzedDocument receipt);

    /// <summary>
    /// Method that extracts the invoice merchant information from the invoice.
    /// The merchant information is stored in the <see cref="InvoiceMerchantInformation"/> record struct.
    /// </summary>
    /// <param name="receipt"></param>
    /// <returns></returns>
    public InvoiceMerchantInformation ExtractInvoiceMerchantInformation(AnalyzedDocument receipt);

    /// <summary>
    /// Method that extracts the invoice time information from the invoice.
    /// The time information is stored in the <see cref="InvoiceTimeInformation"/> record struct.
    /// </summary>
    /// <param name="receipt"></param>
    /// <returns></returns>
    public InvoiceTimeInformation ExtractInvoiceTimeInformation(AnalyzedDocument receipt);
}
