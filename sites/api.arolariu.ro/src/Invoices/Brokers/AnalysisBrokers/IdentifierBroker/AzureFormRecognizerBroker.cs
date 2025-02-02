namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;

using Microsoft.Extensions.Options;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

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
	/// <param name="options"></param>
	public AzureFormRecognizerBroker(IOptionsMonitor<AzureOptions> options)
	{
		ArgumentNullException.ThrowIfNull(options);
		client = new DocumentAnalysisClient(
			new Uri(options.CurrentValue.CognitiveServicesEndpoint),
			new AzureKeyCredential(options.CurrentValue.CognitiveServicesKey));
	}


	/// <inheritdoc/>
	public async ValueTask<Invoice> PerformOcrAnalysisOnSingleInvoice(Invoice invoice, AnalysisOptions options)
	{
		ArgumentNullException.ThrowIfNull(invoice);

		var operation = await client.AnalyzeDocumentFromUriAsync(
			WaitUntil.Completed,
			"prebuilt-receipt",
			invoice.PhotoLocation)
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

		invoice.MerchantReference = merchant;
		invoice.Items = products;
		invoice.PaymentInformation = payment;

		return invoice;
	}
}
