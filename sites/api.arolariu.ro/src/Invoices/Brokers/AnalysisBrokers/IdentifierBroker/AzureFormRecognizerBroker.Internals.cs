namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;

using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using Azure.AI.FormRecognizer.DocumentAnalysis;

public sealed partial class AzureFormRecognizerBroker
{
	internal static Merchant IdentifyMerchant(AnalyzedDocument photo)
	{
		ArgumentNullException.ThrowIfNull(photo);

		var photoFields = photo.Fields;
		var merchant = new Merchant() { CreatedAt = DateTime.UtcNow };

		// Step 1. Extract the merchant name from the analyzed document.
		if (photoFields.TryGetValue("MerchantName", out var merchantNameField)
			&& merchantNameField.FieldType is DocumentFieldType.String)
		{
			merchant.Name = merchantNameField.Value.AsString();
		}

		// Step 2. Extract the merchant address from the analyzed document.
		if (photoFields.TryGetValue("MerchantAddress", out var merchantAddressField))
		{
			if (merchantAddressField.FieldType is DocumentFieldType.String)
			{
				merchant.Address = merchant.Address with
				{
					Address = merchantAddressField.Value.AsString()
				};
			}
			else if (merchantAddressField.FieldType is DocumentFieldType.Address)
			{
				merchant.Address = merchant.Address with
				{
					Address = merchantAddressField.Content
				};
			}
		}


		// Step 3. Extract the merchant phone number from the analyzed document.
		if (photoFields.TryGetValue("MerchantPhoneNumber", out var merchantPhoneNumberField)
			&& (merchantPhoneNumberField.FieldType is DocumentFieldType.PhoneNumber
				|| merchantPhoneNumberField.FieldType is DocumentFieldType.String))
		{
			merchant.Address = merchant.Address with
			{
				PhoneNumber = merchantPhoneNumberField.Value.AsPhoneNumber()
			};
		}

		return merchant;
	}

	internal static PaymentInformation IdentifyPaymentInformation(AnalyzedDocument photo)
	{
		ArgumentNullException.ThrowIfNull(photo);
		var photoFields = photo.Fields;
		var paymentInformation = new PaymentInformation();

		// Step 1. Extract the transaction datetime from the analyzed document.
		if (photoFields.TryGetValue("TransactionDate", out var transactionDateField)
				&& transactionDateField.FieldType is DocumentFieldType.Date)
		{
			paymentInformation.TransactionDate = transactionDateField.Value.AsDate();
			if (photoFields.TryGetValue("TransactionTime", out var transactionTimeField))
			{
				if (transactionTimeField.FieldType is DocumentFieldType.Time)
				{
					paymentInformation.TransactionDate.Add(transactionTimeField.Value.AsTime());
				}
				else if (transactionTimeField.FieldType is DocumentFieldType.Unknown)
				{
					var fieldValue = transactionTimeField.Content;
					var fieldValueAsNumbersOnly = fieldValue.Where(char.IsDigit).ToArray();

					if (fieldValueAsNumbersOnly.Length == 4)
					{
						var hour = int.Parse(fieldValueAsNumbersOnly[0].ToString() + fieldValueAsNumbersOnly[1].ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture);
						var minute = int.Parse(fieldValueAsNumbersOnly[2].ToString() + fieldValueAsNumbersOnly[3].ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture);
						paymentInformation.TransactionDate.Add(new TimeSpan(hour, minute, 0));
					}
					else if (fieldValueAsNumbersOnly.Length == 6)
					{
						var hour = int.Parse(fieldValueAsNumbersOnly[0].ToString() + fieldValueAsNumbersOnly[1].ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture);
						var minute = int.Parse(fieldValueAsNumbersOnly[2].ToString() + fieldValueAsNumbersOnly[3].ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture);
						var second = int.Parse(fieldValueAsNumbersOnly[4].ToString() + fieldValueAsNumbersOnly[5].ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture);
						paymentInformation.TransactionDate.Add(new TimeSpan(hour, minute, second));
					}
				}
			}
		}

		// Step 2. Extract the total amount from the analyzed document.
		if (photoFields.TryGetValue("Total", out var totalField)
				&& totalField.FieldType is DocumentFieldType.Double)
		{
			paymentInformation.TotalCostAmount = (decimal)totalField.Value.AsDouble();
		}

		// Step 3. Extract the total tax amount from the analyzed document.
		if (photoFields.TryGetValue("TotalTax", out var taxField)
				&& taxField.FieldType is DocumentFieldType.Double)
		{
			paymentInformation.TotalTaxAmount = (decimal)taxField.Value.AsDouble();
		}

		return paymentInformation;
	}

	internal static ICollection<Product> IdentifyProducts(AnalyzedDocument photo)
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
					product.Quantity = (decimal)quantityField.Value.AsDouble();
				}

				// Step 4. Extract the quantity unit, if possible.
				if (itemFields.TryGetValue("QuantityUnit", out var quantityUnitField)
											&& quantityUnitField.FieldType is DocumentFieldType.String)
				{
					product.QuantityUnit = quantityUnitField.Value.AsString();
				}

				products.Add(product);
			}
		}

		return products;
	}
}
