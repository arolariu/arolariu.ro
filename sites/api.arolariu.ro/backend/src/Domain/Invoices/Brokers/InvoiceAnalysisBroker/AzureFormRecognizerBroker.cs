using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using arolariu.Backend.Core.Domain.Invoices.Entities.Invoices;
using arolariu.Backend.Core.Domain.Invoices.Entities.Products;

namespace arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceAnalysisBroker;

/// <summary>
/// The <see cref="AzureFormRecognizerBroker"/> class.
/// This class operates with the <see cref="AnalyzedDocument"/> type, from the <see cref="Azure.AI.FormRecognizer.DocumentAnalysis"/> namespace.
/// This type is the result of the invoice analysis operation.
/// The namespace <see cref="Azure.AI.FormRecognizer.DocumentAnalysis"/> is part of the <see cref="Azure.AI.FormRecognizer"/> package.
/// This package is used to interact with the Azure Form Recognizer service.
/// </summary>
public partial class AzureFormRecognizerBroker
{
    private readonly DocumentAnalysisClient client;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="configuration"></param>
    public AzureFormRecognizerBroker(IConfiguration configuration)
    {
        var cognitiveServicesUri = configuration["Azure:CognitiveServices:EndpointName"]
            ?? throw new ArgumentNullException(nameof(configuration));

        var cognitiveServicesConnString = configuration["Azure:CognitiveServices:EndpointKey"]
            ?? throw new ArgumentNullException(nameof(configuration));

        var endpoint = new Uri(cognitiveServicesUri);
        var credentials = new AzureKeyCredential(cognitiveServicesConnString);

        client = new DocumentAnalysisClient(endpoint, credentials);
    }

    /// <summary>
    /// Populates the invoice with the analysis result.
    /// </summary>
    /// <param name="invoice"></param>
    /// <param name="analyzedInvoiceResult"></param>
    /// <returns></returns>
    public async ValueTask<Invoice> PopulateInvoiceWithAnalysisResultAsync(Invoice invoice, AnalyzedDocument analyzedInvoiceResult)
    {
        var items = await RetrieveFoundProducts(analyzedInvoiceResult);
        var merchant = await RetrieveMerchantInformation(analyzedInvoiceResult);
        var identifiedDateTime = RetrieveIdentifiedDate(analyzedInvoiceResult);
        var totalAmount = RetrieveTotalAmount(analyzedInvoiceResult);
        var totalTax = RetrieveTotalTax(analyzedInvoiceResult);

        return invoice with
        {
            Items = items,
            Metadata = invoice.Metadata with { IsAnalyzed = true },
            Merchant = merchant,
            DateOfPurchase = identifiedDateTime,
            DateOfAnalysis = DateTime.UtcNow,
            LastModifiedDate = DateTime.UtcNow,
            TotalAmount = totalAmount,
            TotalTax = totalTax
        };
    }

    /// <summary>
    /// Retrieves the invoice items from the analysis result.
    /// </summary>
    /// <param name="analyzedInvoiceResult"></param>
    /// <returns></returns>
    public async ValueTask<IEnumerable<Product>> RetrieveFoundProducts(AnalyzedDocument analyzedInvoiceResult)
    {
        var products = new List<Product>();

        if (analyzedInvoiceResult.Fields.TryGetValue("Items", out DocumentField? itemsField)
            && itemsField.FieldType == DocumentFieldType.List)
        {
            foreach (var itemField in itemsField.Value.AsList())
            {
                if (itemField.FieldType == DocumentFieldType.Dictionary)
                {
                    var item = RetrieveItem(itemField);
                    products.Add(item);
                }
            }
        }

        return await ValueTask.FromResult(products);
    }

    /// <summary>
    /// Sends the invoice to analysis.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns></returns>
    public async ValueTask<AnalyzedDocument> SendInvoiceToAnalysisAsync(Invoice invoice)
    {
        var operation = await client.AnalyzeDocumentFromUriAsync(
            WaitUntil.Completed,
            "prebuilt-receipt",
            invoice.ImageLocation);

        var result = operation.Value;
        var receipt = result.Documents[0];
        return receipt;
    }
}
