using arolariu.Backend.Domain.General.Services.KeyVault;

using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;

using Newtonsoft.Json.Linq;

using System;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.InvoiceReader;

/// <summary>
/// Invoice reader service.
/// </summary>
public partial class InvoiceReaderService : IInvoiceReaderService
{
    private readonly DocumentAnalysisClient client;
    private readonly JObject jsonResult;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="keyVaultService"></param>
    public InvoiceReaderService(IKeyVaultService keyVaultService)
    {
        var endpoint = new Uri(keyVaultService.GetSecret("arolariu-cognitive-services-endpoint"));
        var credentials = new AzureKeyCredential(keyVaultService.GetSecret("arolariu-cognitive-services-connString"));
        client = new DocumentAnalysisClient(endpoint, credentials);
        jsonResult = new JObject()
        {
            ["MerchantName"] = "",
            ["MerchantAddress"] = "",
            ["TransactionDate"] = "",
            ["TransactionTime"] = "",
            ["TransactionTotal"] = "",
            ["Items"] = new JObject()
            {
                { "BoughtItems", new JObject() },
                { "DiscountedItems", new JObject() }
            },
        };
    }

    /// <inheritdoc/>
    public async Task<AnalyzeResult> SendInvoiceBlobForAnalysis(Uri invoiceBlobUri)
    {
        AnalyzeDocumentOperation operation = await client.AnalyzeDocumentFromUriAsync(WaitUntil.Completed, "prebuilt-receipt", invoiceBlobUri);
        return operation.Value;
    }

    /// <inheritdoc/>
    public JObject ParseInvoiceAnalysisResult(AnalyzeResult invoiceAnalysisResult)
    {
        var receipt = invoiceAnalysisResult.Documents[0];
        ValidateMerchantInformation(receipt);
        ValidateTransactionInformation(receipt);
        ValidateInvoiceItems(receipt);
        return jsonResult;
    }
}