using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;
using arolariu.Backend.Domain.Invoices.Entities.Products;
using arolariu.Backend.Domain.Invoices.Entities.Invoices;
using Microsoft.Extensions.Configuration;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.Brokers.InvoiceAnalysisBroker;

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
        ArgumentNullException.ThrowIfNull(configuration);
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
    [SuppressMessage("Performance", "CA1822:Mark members as static", Justification = "<Pending>")]
    public Invoice PopulateInvoiceWithAnalysisResult(Invoice invoice, AnalyzedDocument analyzedInvoiceResult)
    {
        ArgumentNullException.ThrowIfNull(invoice);
        ArgumentNullException.ThrowIfNull(analyzedInvoiceResult);

        var items = RetrieveFoundProducts(analyzedInvoiceResult);
        var merchant = RetrieveMerchantInformation(analyzedInvoiceResult);

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
    public static IEnumerable<Product> RetrieveFoundProducts(AnalyzedDocument analyzedInvoiceResult)
    {
        ArgumentNullException.ThrowIfNull(analyzedInvoiceResult);
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

        return products;
    }

    /// <summary>
    /// Sends the invoice to analysis.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns></returns>
    public async ValueTask<AnalyzedDocument> SendInvoiceToAnalysisAsync(Invoice invoice)
    {
        ArgumentNullException.ThrowIfNull(invoice);
        var operation = await client
            .AnalyzeDocumentFromUriAsync(
            WaitUntil.Completed,
            "prebuilt-receipt",
            invoice.ImageLocation)
            .ConfigureAwait(false);

        var result = operation.Value;
        var receipt = result.Documents[0];
        return receipt;
    }
}
