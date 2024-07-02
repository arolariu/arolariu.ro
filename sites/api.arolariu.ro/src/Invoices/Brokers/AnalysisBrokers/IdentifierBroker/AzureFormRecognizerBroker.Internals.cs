namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;
using System;
using System.Collections.Generic;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
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

	internal static PaymentInformation IdentifyPaymentInformation(AnalyzedDocument photo)
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

	internal static IEnumerable<Product> IdentifyProducts(AnalyzedDocument photo)
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

				product.Id = Guid.NewGuid(); // Id is only used internally by EF Core.
				products.Add(product);
			}
		}

		return products;
	}
}
