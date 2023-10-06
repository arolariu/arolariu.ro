using arolariu.Backend.Core.Domain.Invoices.Entities.Merchants;
using arolariu.Backend.Core.Domain.Invoices.Entities.Products;

using Azure.AI.FormRecognizer.DocumentAnalysis;
using System;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceAnalysisBroker;

public partial class AzureFormRecognizerBroker
{
    private static decimal RetrieveTotalTax(AnalyzedDocument analyzedInvoiceResult)
    {
        var totalTax = decimal.MinValue;
        if (analyzedInvoiceResult.Fields.TryGetValue("TotalTax", out DocumentField? totalTaxField)
            && totalTaxField?.FieldType == DocumentFieldType.Double)
        {
            totalTax = Convert.ToDecimal(totalTaxField.Value.AsDouble());
            Console.WriteLine($"Total: '{totalTax}', with confidence '{totalTaxField.Confidence}'");
        }

        return totalTax;
    }

    private static decimal RetrieveTotalAmount(AnalyzedDocument analyzedInvoiceResult)
    {
        var totalAmount = decimal.MinValue;
        if (analyzedInvoiceResult.Fields.TryGetValue("Total", out DocumentField? totalField)
            && totalField?.FieldType == DocumentFieldType.Double)
        {
            totalAmount = Convert.ToDecimal(totalField.Value.AsDouble());
            Console.WriteLine($"Total: '{totalAmount}', with confidence '{totalField.Confidence}'");
        }

        return totalAmount;
    }

    private static DateTimeOffset RetrieveIdentifiedDate(AnalyzedDocument analyzedInvoiceResult)
    {
        var identifiedDateTime = new DateTimeOffset();

        if (analyzedInvoiceResult.Fields.TryGetValue("TransactionDate", out DocumentField? transactionDateField)
            && transactionDateField?.FieldType == DocumentFieldType.Date)
        {
            identifiedDateTime = transactionDateField.Value.AsDate();
            Console.WriteLine($"Transaction Date: '{identifiedDateTime}', with confidence {transactionDateField.Confidence}");
        }

        if (analyzedInvoiceResult.Fields.TryGetValue("TransactionTime", out DocumentField? transactionTimeField)
            && transactionTimeField?.FieldType == DocumentFieldType.Time)
        {
            var transactionTime = transactionTimeField.Value.AsTime();
            identifiedDateTime.Add(transactionTime);
            Console.WriteLine($"Transaction Time: '{transactionTime}', with confidence {transactionTimeField.Confidence}");
        }

        return identifiedDateTime;
    }

    private async ValueTask<Merchant> RetrieveMerchantInformation(AnalyzedDocument analyzedInvoiceResult)
    {
        var merchantName = string.Empty;
        var merchantAddress = string.Empty;
        var merchantPhoneNumber = string.Empty;

        if (analyzedInvoiceResult.Fields.TryGetValue("MerchantName", out DocumentField? merchantNameField)
            && merchantNameField?.FieldType == DocumentFieldType.String)
        {
            merchantName = merchantNameField.Value.AsString();
            Console.WriteLine($"Merchant Name: '{merchantName}', with confidence {merchantNameField.Confidence}");
        }

        if (analyzedInvoiceResult.Fields.TryGetValue("MerchantAddress", out DocumentField? merchantAddressField)
            && merchantAddressField?.FieldType == DocumentFieldType.String)
        {
            merchantAddress = merchantAddressField.Value.AsString();
            Console.WriteLine($"Merchant Address: '{merchantAddress}', with confidence {merchantAddressField.Confidence}");
        }

        if (analyzedInvoiceResult.Fields.TryGetValue("MerchantPhoneNumber", out DocumentField? merchantPhoneField)
            && merchantPhoneField?.FieldType == DocumentFieldType.String)
        {
            merchantPhoneNumber = merchantPhoneField.Value.AsString();
            Console.WriteLine($"Merchant Phone Number: '{merchantPhoneNumber}', with confidence {merchantPhoneField.Confidence}");
        }

        return await ValueTask.FromResult(
            new Merchant()
            {
                Name = merchantName,
                Address = merchantAddress,
                PhoneNumber = merchantPhoneNumber
            });
    }

    private static Product RetrieveItem(DocumentField itemField)
    {
        var item = new Product();
        var itemFields = itemField.Value.AsDictionary();

        if (itemFields.TryGetValue("Description", out DocumentField? nameField)
            && nameField?.FieldType == DocumentFieldType.String)
        {
            item = item with { RawName = nameField.Value.AsString() };
            Console.WriteLine($"Item Name: '{item.RawName}', with confidence {nameField.Confidence}");
        }

        if (itemFields.TryGetValue("Quantity", out DocumentField? quantityField)
            && quantityField?.FieldType == DocumentFieldType.Double)
        {
            item = item with { Quantity = Convert.ToInt32(quantityField.Value.AsDouble()) };
            Console.WriteLine($"Item Quantity: '{item.Quantity}', with confidence {quantityField.Confidence}");
        }

        if (itemFields.TryGetValue("QuantityUnit", out DocumentField? quantityUnitField)
            && quantityUnitField?.FieldType == DocumentFieldType.String)
        {
            item = item with { QuantityUnit = quantityUnitField.Value.AsString() };
            Console.WriteLine($"Item Quantity: '{item.QuantityUnit}', with confidence {quantityUnitField.Confidence}");
        }

        if (itemFields.TryGetValue("Price", out DocumentField? priceField)
            && priceField?.FieldType == DocumentFieldType.Double)
        {
            item = item with { Price = Convert.ToDecimal(priceField.Value.AsDouble()) };
            Console.WriteLine($"Item Price: '{item.Price}', with confidence {priceField.Confidence}");
        }

        if (itemFields.TryGetValue("TotalPrice", out DocumentField? totalPriceField)
            && totalPriceField?.FieldType == DocumentFieldType.Double)
        {
            item = item with { TotalPrice = Convert.ToDecimal(totalPriceField.Value.AsDouble()) };
            Console.WriteLine($"Item Total Price: '{item.TotalPrice}', with confidence {totalPriceField.Confidence}");
        }

        if (item.Quantity == -1) { item.Quantity = 1; }
        if (item.Price == -1) { item.Price = item.TotalPrice; }
        return item;
    }
}
