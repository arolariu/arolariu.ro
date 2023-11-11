using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;
using Microsoft.Extensions.Configuration;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.Brokers.ReceiptRecognizerBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

namespace arolariu.Backend.Domain.Invoices.Brokers.InvoiceAnalysisBroker;

/// <summary>
/// The <see cref="AzureFormRecognizerBroker"/> class.
/// This class operates with the <see cref="AnalyzedDocument"/> type, from the <see cref="Azure.AI.FormRecognizer.DocumentAnalysis"/> namespace.
/// This type is the result of the invoice analysis operation.
/// The namespace <see cref="Azure.AI.FormRecognizer.DocumentAnalysis"/> is part of the <see cref="Azure.AI.FormRecognizer"/> package.
/// This package is used to interact with the Azure Form Recognizer service.
/// </summary>
[ExcludeFromCodeCoverage] // brokers are not tested - they are wrappers over external services.
public partial class AzureFormRecognizerBroker : IReceiptRecognizerBroker
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
            invoice.ImageLocation) // TODO: fix this.
            .ConfigureAwait(false);

        var result = operation.Value;
        var receipt = result.Documents[0];
        return receipt;
    }

    /// <inheritdoc/>
    public Task<Merchant> RecognizeMerchantFromPhotoContentAsync<T>(T photoContent)
    {
        throw new NotImplementedException();
    }

    /// <inheritdoc/>
    public Task<PaymentInformation> RecognizePaymentInformationAsync<T>(T photoContent)
    {
        throw new NotImplementedException();
    }

    /// <inheritdoc/>
    public Task<IEnumerable<Product>> RecognizeProductsFromPhotoContentAsync<T>(T photoContent)
    {
        throw new NotImplementedException();
    }
}
