using Azure.AI.FormRecognizer.DocumentAnalysis;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System;

namespace arolariu.Backend.Domain.Invoices.Services.InvoiceReader
{
    public partial class InvoiceReaderService
    {

        private void ValidateTransactionInformation(AnalyzedDocument receipt)
        {
            ValidateTotalAmount(receipt);
            ValidateTransactionDate(receipt);
            ValidateTransactionTime(receipt);
        }

        private void ValidateMerchantInformation(AnalyzedDocument receipt)
        {
            ValidateMerchantAddress(receipt);
            ValidateMerchantName(receipt);
        }


        private void ValidateInvoiceItems(AnalyzedDocument receipt)
        {
            if (receipt.Fields.TryGetValue("Items", out DocumentField? itemsField)
                && itemsField.FieldType == DocumentFieldType.List)
            {
                var discountedItems = new JObject();
                var boughtItems = new JObject();

                foreach (DocumentField itemField in itemsField.Value.AsList())
                {
                    Console.WriteLine("Item:");

                    if (itemField.FieldType == DocumentFieldType.Dictionary)
                    {
                        IReadOnlyDictionary<string, DocumentField> itemFields = itemField.Value.AsDictionary();
                        string? key = null;
                        double? value = null;

                        if (itemFields.TryGetValue("Description", out DocumentField? itemDescriptionField)
                            && itemDescriptionField.FieldType == DocumentFieldType.String)
                        {
                            string itemDescription = itemDescriptionField.Value.AsString();
                            key = itemDescription;
                            Console.WriteLine($"  Description: '{itemDescription}', with confidence {itemDescriptionField.Confidence}");
                        }

                        if (itemFields.TryGetValue("TotalPrice", out DocumentField? itemTotalPriceField)
                            && itemTotalPriceField.FieldType == DocumentFieldType.Double)
                        {
                            double itemTotalPrice = itemTotalPriceField.Value.AsDouble();
                            value = itemTotalPrice;
                            Console.WriteLine($"  Total Price: '{itemTotalPrice}', with confidence {itemTotalPriceField.Confidence}");
                        }

                        if (key != null && value != null)
                        {
                            if (value < 0) // We have identified a discount.
                            {
                                discountedItems.Add(key, value);
                            }
                            else
                            {
                                boughtItems.Add(key, value);
                            }
                        }
                    }
                }
                jsonResult["Items"]!["BoughtItems"] = boughtItems.DeepClone();
                jsonResult["Items"]!["DiscountedItems"] = discountedItems.DeepClone();
            }
        }
        private void ValidateTransactionDate(AnalyzedDocument receipt)
        {
            if (receipt.Fields.TryGetValue("TransactionDate", out DocumentField? transactionDateField))
            {
                if (transactionDateField.FieldType == DocumentFieldType.Date)
                {
                    DateTimeOffset transactionDate = transactionDateField.Value.AsDate();
                    jsonResult["TransactionDate"] = transactionDate.Date.ToLongDateString();
                    Console.WriteLine($"Transaction Date: '{transactionDate}', with confidence {transactionDateField.Confidence}");
                }
            }
        }
        private void ValidateTransactionTime(AnalyzedDocument receipt)
        {
            if (receipt.Fields.TryGetValue("TransactionTime", out DocumentField? transactionTimeField))
            {
                if (transactionTimeField.FieldType == DocumentFieldType.Time)
                {
                    TimeSpan transactionTime = transactionTimeField.Value.AsTime();
                    DateTimeOffset transactionTimeOffset = DateTimeOffset.UtcNow.Date + transactionTime;
                    jsonResult["TransactionTime"] = transactionTimeOffset.ToString("HH:mm:ss");
                    Console.WriteLine($"Transaction Time: '{transactionTime}', with confidence {transactionTimeField.Confidence}");
                }
            }
        }
        private void ValidateMerchantName(AnalyzedDocument receipt)
        {
            if (receipt.Fields.TryGetValue("MerchantName", out DocumentField? merchantNameField))
            {
                if (merchantNameField.FieldType == DocumentFieldType.String)
                {
                    string merchantName = merchantNameField.Value.AsString();
                    jsonResult["MerchantName"] = merchantName;
                    Console.WriteLine($"Merchant Name: '{merchantName}', with confidence {merchantNameField.Confidence}");
                }
            }
        }
        private void ValidateMerchantAddress(AnalyzedDocument receipt)
        {
            if (receipt.Fields.TryGetValue("MerchantAddress", out DocumentField? merchantAddressField))
            {
                if (merchantAddressField.FieldType == DocumentFieldType.String)
                {
                    string merchantAddress = merchantAddressField.Value.AsString();
                    jsonResult["MerchantAddress"] = merchantAddress;
                    Console.WriteLine($"Merchant Address: '{merchantAddress}', with confidence {merchantAddressField.Confidence}");
                }
            }
        }
        private void ValidateTotalAmount(AnalyzedDocument receipt)
        {
            if (receipt.Fields.TryGetValue("Total", out DocumentField? totalField))
            {
                if (totalField.FieldType == DocumentFieldType.Double)
                {
                    double total = totalField.Value.AsDouble();
                    jsonResult["TransactionTotal"] = total;
                    Console.WriteLine($"Total: '{total}', with confidence '{totalField.Confidence}'");
                }
            }
        }

    }
}
