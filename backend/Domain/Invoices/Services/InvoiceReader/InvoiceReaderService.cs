using arolariu.Backend.Domain.General.Services.KeyVault;
using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.InvoiceReader
{
    /// <summary>
    /// Invoice reader service.
    /// </summary>
    public class InvoiceReaderService : IInvoiceReaderService
    {
        private readonly DocumentAnalysisClient client;
        private readonly JObject jsonResult;

        /// <summary>
        /// Constructor.
        /// </summary>
        /// <param name="keyVaultService"></param>
        public InvoiceReaderService(IKeyVaultService keyVaultService)
        {
            var endpoint = new Uri(keyVaultService.GetSecret("arolariu-cognitive-services-endpoint"));
            var credentials = new AzureKeyCredential(keyVaultService.GetSecret("arolariu-cognitive-services-connString"));
            client = new DocumentAnalysisClient(endpoint, credentials);
            jsonResult = new JObject()
            {
                ["MerchantName"] = "",
                ["MerchantAddress"] = "",
                ["TransactionDate"] = "",
                ["TransactionTime"] = "",
                ["TransactionTotal"] = "",
                ["Items"] = new JObject()
                {
                    { "BoughtItems", new JObject() },
                    { "DiscountedItems", new JObject() }
                },
            };
        }

        /// <inheritdoc/>
        public async Task<AnalyzeResult> SendInvoiceBlobForAnalysis(Uri invoiceBlobUri)
        {
            AnalyzeDocumentOperation operation = await client.AnalyzeDocumentFromUriAsync(WaitUntil.Completed, "prebuilt-receipt", invoiceBlobUri);
            return operation.Value;
        }

        /// <inheritdoc/>
        public JObject ParseInvoiceAnalysisResult(AnalyzeResult invoiceAnalysisResult)
        {
            foreach (AnalyzedDocument receipt in invoiceAnalysisResult.Documents)
            {
                ValidateMerchantName(receipt);
                ValidateTransactionDate(receipt);
                ValidateTransactionTime(receipt);
                ValidateInvoiceItems(receipt);
                ValidateTotalAmount(receipt);
            }
            return jsonResult;
        }


        private void ValidateInvoiceItems(AnalyzedDocument receipt)
        {
            if (receipt.Fields.TryGetValue("Items", out DocumentField? itemsField))
            {
                if (itemsField.FieldType == DocumentFieldType.List)
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

                            if (itemFields.TryGetValue("Description", out DocumentField? itemDescriptionField))
                            {
                                if (itemDescriptionField.FieldType == DocumentFieldType.String)
                                {
                                    string itemDescription = itemDescriptionField.Value.AsString();
                                    key =  itemDescription;
                                    Console.WriteLine($"  Description: '{itemDescription}', with confidence {itemDescriptionField.Confidence}");
                                }
                            }

                            if (itemFields.TryGetValue("TotalPrice", out DocumentField? itemTotalPriceField))
                            {
                                if (itemTotalPriceField.FieldType == DocumentFieldType.Double)
                                {
                                    double itemTotalPrice = itemTotalPriceField.Value.AsDouble();
                                    value = itemTotalPrice;
                                    Console.WriteLine($"  Total Price: '{itemTotalPrice}', with confidence {itemTotalPriceField.Confidence}");
                                }
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