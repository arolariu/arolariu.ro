namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;
using Azure.Identity;

/// <summary>
/// The <see cref="AzureFormRecognizerBroker"/> class.
/// This class operates with the <see cref="AnalyzedDocument"/> type, from the <see cref="Azure.AI.FormRecognizer.DocumentAnalysis"/> namespace.
/// This type is the result of the invoice analysis operation.
/// The namespace <see cref="Azure.AI.FormRecognizer.DocumentAnalysis"/> is part of the <see cref="Azure.AI.FormRecognizer"/> package.
/// This package is used to interact with the Azure Form Recognizer service.
/// </summary>
[ExcludeFromCodeCoverage] // brokers are not tested - they are wrappers over external services.
public sealed partial class AzureFormRecognizerBroker : IFormRecognizerBroker
{
	private readonly DocumentAnalysisClient client;

	/// <summary>
	/// Constructor.
	/// </summary>
	/// <param name="optionsManager"></param>
	public AzureFormRecognizerBroker(IOptionsManager optionsManager)
	{
		ArgumentNullException.ThrowIfNull(optionsManager);
		ApplicationOptions options = optionsManager.GetApplicationOptions();

		var documentIntelligenceEndpoint = options.CognitiveServicesEndpoint;
		var documentIntelligenceKey = options.CognitiveServicesKey;
		var credentials = new DefaultAzureCredential(
#if !DEBUG
			new DefaultAzureCredentialOptions
			{
				ManagedIdentityClientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID")
			}
#endif
		);

		client = new DocumentAnalysisClient(
			endpoint: new Uri(documentIntelligenceEndpoint),
			credential: credentials);
	}


	/// <inheritdoc/>
	public async ValueTask<Invoice> PerformOcrAnalysisOnSingleInvoice(Invoice invoice, AnalysisOptions options)
	{
		ArgumentNullException.ThrowIfNull(invoice);

		var operation = await client.AnalyzeDocumentFromUriAsync(
			WaitUntil.Completed,
			"prebuilt-receipt",
			invoice.Scan.Location)
			.ConfigureAwait(false);

		var result = operation.Value;
		var receipt = result.Documents[0];

		return TransformOcrDataToInvoiceData(receipt, invoice);
	}

	private static Invoice TransformOcrDataToInvoiceData(AnalyzedDocument ocrData, Invoice invoice)
	{
		var merchant = IdentifyMerchant(ocrData);
		var products = IdentifyProducts(ocrData);
		var payment = IdentifyPaymentInformation(ocrData);

		invoice.MerchantReference = merchant.id;

		#region Populate the items array:
		foreach (var product in products)
		{
			invoice.Items.Add(product);
		}
		#endregion

		invoice.PaymentInformation = payment;

		return invoice;
	}
}
