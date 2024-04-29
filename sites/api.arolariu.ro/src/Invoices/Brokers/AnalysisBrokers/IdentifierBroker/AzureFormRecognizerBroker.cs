namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;

using Microsoft.Extensions.Options;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Threading.Tasks;

/// <summary>
/// The <see cref="AzureFormRecognizerBroker"/> class.
/// This class operates with the <see cref="AnalyzedDocument"/> type, from the <see cref="Azure.AI.FormRecognizer.DocumentAnalysis"/> namespace.
/// This type is the result of the invoice analysis operation.
/// The namespace <see cref="Azure.AI.FormRecognizer.DocumentAnalysis"/> is part of the <see cref="Azure.AI.FormRecognizer"/> package.
/// This package is used to interact with the Azure Form Recognizer service.
/// </summary>
[ExcludeFromCodeCoverage] // brokers are not tested - they are wrappers over external services.
public partial class AzureFormRecognizerBroker : IIdentifierBroker<AnalyzedDocument>
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
			invoice.PhotoLocation)
			.ConfigureAwait(false);

		var result = operation.Value;
		var receipt = result.Documents[0];
		return receipt;
	}

	/// <inheritdoc/>
#pragma warning disable CS1998 // Async method lacks 'await' operators and will run synchronously
	public async Task<Merchant> IdentifyMerchant(AnalyzedDocument photo)
	{
		ArgumentNullException.ThrowIfNull(photo);
		var photoFields = photo.Fields;
		var merchant = new Merchant();

		// Step 1. Extract the merchant name from the analyzed document.
		if (photoFields.TryGetValue("MerchantName", out var merchantNameField)
			&& merchantNameField.FieldType is DocumentFieldType.String)
		{
			merchant.Name = merchantNameField.Value.AsString();
		}

		// Step 2. Extract the merchant address from the analyzed document.
		if (photoFields.TryGetValue("MerchantAddress", out var merchantAddressField)
			&& merchantAddressField.FieldType is DocumentFieldType.String)
		{
			merchant.Address = merchantAddressField.Value.AsString();
		}

		// Step 3. Extract the merchant phone number from the analyzed document.
		if (photoFields.TryGetValue("MerchantPhoneNumber", out var merchantPhoneNumberField)
			&& (merchantPhoneNumberField.FieldType is DocumentFieldType.PhoneNumber
				|| merchantPhoneNumberField.FieldType is DocumentFieldType.String))
		{
			merchant.PhoneNumber = merchantPhoneNumberField.Value.AsPhoneNumber();
		}

		return merchant;
	}

	/// <inheritdoc/>
	public async Task<PaymentInformation> IdentifyPaymentInformation(AnalyzedDocument photo)
	{
		ArgumentNullException.ThrowIfNull(photo);
		var photoFields = photo.Fields;
		var paymentInformation = new PaymentInformation();

		// Step 1. Extract the transaction datetime from the analyzed document.
		if (photoFields.TryGetValue("TransactionDate", out var transactionDateField)
				&& transactionDateField.FieldType is DocumentFieldType.Date)
		{
			paymentInformation.DateOfPurchase = transactionDateField.Value.AsDate();
			if (photoFields.TryGetValue("TransactionTime", out var transactionTimeField)
					&& transactionTimeField.FieldType is DocumentFieldType.Time)
			{
				paymentInformation.DateOfPurchase.Add(transactionTimeField.Value.AsTime());
			}
		}

		// Step 2. Extract the total amount from the analyzed document.
		if (photoFields.TryGetValue("Total", out var totalField)
				&& totalField.FieldType is DocumentFieldType.Double)
		{
			paymentInformation.TotalAmount = (decimal)totalField.Value.AsDouble();
		}

		// Step 3. Extract the total tax amount from the analyzed document.
		if (photoFields.TryGetValue("TotalTax", out var taxField)
				&& taxField.FieldType is DocumentFieldType.Double)
		{
			paymentInformation.TotalTax = (decimal)taxField.Value.AsDouble();
		}

		return paymentInformation;
	}

	/// <inheritdoc/>
	public async Task<IEnumerable<Product>> IdentifyProducts(AnalyzedDocument photo)
	{
		ArgumentNullException.ThrowIfNull(photo);
		var photoFields = photo.Fields;
		var products = new List<Product>();

		// Iterate over the document fields and work only with products.
		if (photoFields.TryGetValue("Items", out var itemsList)
				&& itemsList.FieldType is DocumentFieldType.List)
		{
			foreach (var item in itemsList.Value.AsList()
					.Where(item => item.FieldType is DocumentFieldType.Dictionary))
			{
				var itemFields = item.Value.AsDictionary();
				var product = new Product();

				// Step 1. Extract the raw name of the product.
				if (itemFields.TryGetValue("Description", out var nameField)
											&& nameField.FieldType is DocumentFieldType.String)
				{
					product.RawName = nameField.Value.AsString();
				}

				// Step 2. Extract the price of the product.
				if (itemFields.TryGetValue("Price", out var priceField)
											&& priceField.FieldType is DocumentFieldType.Double)
				{
					product.Price = (decimal)priceField.Value.AsDouble();
				}

				// Step 3. Extract the quantity of the product.
				if (itemFields.TryGetValue("Quantity", out var quantityField))
				{
					product.Quantity = (int)quantityField.Value.AsDouble();
				}

				// Step 4. Extract the quantity unit, if possible.
				if (itemFields.TryGetValue("QuantityUnit", out var quantityUnitField)
											&& quantityUnitField.FieldType is DocumentFieldType.String)
				{
					product.QuantityUnit = quantityUnitField.Value.AsString();
				}

				// Step 5. Extract the total price of the product(s).
				if (itemFields.TryGetValue("TotalPrice", out var totalPriceField)
											&& totalPriceField.FieldType is DocumentFieldType.Double)
				{
					product.TotalPrice = (decimal)totalPriceField.Value.AsDouble();
				}

				products.Add(product);
			}
		}

		return products;
	}
#pragma warning restore CS1998 // Async method lacks 'await' operators and will run synchronously
}
