using arolariu.Backend.Domain.General.Services.KeyVault;
using arolariu.Backend.Domain.Invoices.Models;
using arolariu.Backend.Domain.Invoices.Services.InvoiceDetailsExtractor;

using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;

using Microsoft.Azure.Cosmos.Serialization.HybridRow;

using Newtonsoft.Json.Linq;

using System;
using System.Linq;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.InvoiceReader;

/// <summary>
/// Invoice reader service.
/// </summary>
public class InvoiceReaderService : IInvoiceReaderService
{
    private readonly DocumentAnalysisClient client;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="keyVaultService"></param>
    public InvoiceReaderService(IKeyVaultService keyVaultService)
    {
        var endpoint = new Uri(keyVaultService.GetSecret("arolariu-cognitive-services-endpoint"));
        var credentials = new AzureKeyCredential(keyVaultService.GetSecret("arolariu-cognitive-services-connString"));
        client = new DocumentAnalysisClient(endpoint, credentials);
    }

    /// <inheritdoc/>
    public async Task<AnalyzedDocument> SendInvoiceToCognitiveServices(Invoice invoice)
    {
        var operation = await client.AnalyzeDocumentFromUriAsync(
            WaitUntil.Completed,
            "prebuilt-receipt",
            invoice.InvoiceImageURI);

        var result = operation.Value;
        var receipt = result.Documents[0];
        return receipt;
    }

    /// <inheritdoc/>
    public Invoice UpdateInvoiceWithAnalyzedData(Invoice invoice, AnalyzedDocument receipt)
    {
        var invoiceItemsInformation = InvoiceDetailsExtractorService.ExtractInvoiceItemsInformation(receipt);
        var invoiceMerchantInformation = InvoiceDetailsExtractorService.ExtractInvoiceMerchantInformation(receipt);
        var invoiceTimeInformation = InvoiceDetailsExtractorService.ExtractInvoiceTimeInformation(receipt);
        var invoiceTransactionInformation = InvoiceDetailsExtractorService.ExtractInvoiceTransactionInformation(receipt);

        return invoice with
        {
            Items = invoiceItemsInformation,
            MerchantInformation = invoiceMerchantInformation,
            InvoiceTime = invoiceTimeInformation,
            TransactionInformation = invoiceTransactionInformation
        };
    }
}