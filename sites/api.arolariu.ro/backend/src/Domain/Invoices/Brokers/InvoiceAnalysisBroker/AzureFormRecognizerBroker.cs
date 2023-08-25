using arolariu.Backend.Core.Domain.General.Services.KeyVault;

using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

namespace arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceAnalysisBroker;

/// <summary>
/// The <see cref="AzureFormRecognizerBroker"/> class.
/// This class operates with the <see cref="AnalyzedDocument"/> type, from the <see cref="Azure.AI.FormRecognizer.DocumentAnalysis"/> namespace.
/// This type is the result of the invoice analysis operation.
/// The namespace <see cref="Azure.AI.FormRecognizer.DocumentAnalysis"/> is part of the <see cref="Azure.AI.FormRecognizer"/> package.
/// This package is used to interact with the Azure Form Recognizer service.
/// </summary>
public class AzureFormRecognizerBroker
{
    private readonly DocumentAnalysisClient client;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="keyVaultService"></param>
    /// TODO: this should be injected in the appsettings.json file.
    /// TODO 2: maybe it should only be instantiated for the method that uses it...?
    public AzureFormRecognizerBroker(IKeyVaultService keyVaultService)
    {
        var cognitiveServicesUri = keyVaultService.GetSecret("arolariu-cognitive-services-endpoint");
        var cognitiveServicesConnString = keyVaultService.GetSecret("arolariu-cognitive-services-connString");

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
    public async ValueTask<Invoice> PopulateInvoiceWithAnalysisResultAsync(Invoice invoice, AnalyzedDocument analyzedInvoiceResult)
    {
        var items = await RetrieveInvoiceItemsFromAnalysisResultAsync(analyzedInvoiceResult);
        var merchant = await RetrieveMerchantInformationFromAnalysisResultAsync(analyzedInvoiceResult);

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


        var totalAmount = decimal.MinValue;
        var totalTax = decimal.MinValue;

        if (analyzedInvoiceResult.Fields.TryGetValue("Total", out DocumentField? totalField)
            && totalField?.FieldType == DocumentFieldType.Double)
        {
            totalAmount = Convert.ToDecimal(totalField.Value.AsDouble());
            Console.WriteLine($"Total: '{totalAmount}', with confidence '{totalField.Confidence}'");
        }
        if (analyzedInvoiceResult.Fields.TryGetValue("TotalTax", out DocumentField? totalTaxField)
            && totalTaxField?.FieldType == DocumentFieldType.Double)
        {
            totalTax = Convert.ToDecimal(totalTaxField.Value.AsDouble());
            Console.WriteLine($"Total: '{totalTax}', with confidence '{totalTaxField.Confidence}'");
        }

        invoice = invoice with
        {
            Items = items,
            Merchant = merchant,
            IsAnalyzed = true,
            IdentifiedDate = identifiedDateTime,
            LastAnalyzedDate = DateTime.UtcNow,
            LastModifiedDate = DateTime.UtcNow,
            TotalAmount = totalAmount,
            TotalTax = totalTax
        };
        return invoice;
    }

    /// <summary>
    /// Retrieves the invoice items from the analysis result.
    /// </summary>
    /// <param name="analyzedInvoiceResult"></param>
    /// <returns></returns>
    public async ValueTask<IEnumerable<InvoiceItem>> RetrieveInvoiceItemsFromAnalysisResultAsync(AnalyzedDocument analyzedInvoiceResult)
    {
        var invoiceItems = new List<InvoiceItem>();

        if (analyzedInvoiceResult.Fields.TryGetValue("Items", out DocumentField? itemsField)
            && itemsField.FieldType == DocumentFieldType.List)
        {
            var itemsFieldList = itemsField.Value.AsList();
            foreach (var itemField in itemsFieldList)
            {
                if (itemField.FieldType == DocumentFieldType.Dictionary)
                {
                    var item = InvoiceMappings.CreateDefaultInvoiceItem();
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
                    
                    if (item.Quantity == -1) { item.Quantity = 1; } // Validation resets
                    if (item.Price == -1) { item.Price = item.TotalPrice; }
                    invoiceItems.Add(item);
                }
                else
                {
                    Console.WriteLine($"Item is not a dictionary, but a {itemField.FieldType}");
                }
            }
        }

        return await ValueTask.FromResult(invoiceItems);
    }

    /// <summary>
    /// Retrieves the merchant information from the analysis result.
    /// </summary>
    /// <param name="analyzedInvoiceResult"></param>
    /// <returns></returns>
    public async ValueTask<InvoiceMerchant> RetrieveMerchantInformationFromAnalysisResultAsync(AnalyzedDocument analyzedInvoiceResult)
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
            new InvoiceMerchant()
            {
                Name = merchantName,
                Address = merchantAddress,
                PhoneNumber = merchantPhoneNumber
            });
    }

    /// <summary>
    /// Sends the invoice to analysis.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns></returns>
    public async ValueTask<AnalyzedDocument> SendInvoiceToAnalysisAsync(Invoice invoice)
    {
        var operation = await client.AnalyzeDocumentFromUriAsync(
            WaitUntil.Completed,
            "prebuilt-receipt",
            invoice.ImageUri);

        var result = operation.Value;
        var receipt = result.Documents[0];
        return receipt;
    }
}
