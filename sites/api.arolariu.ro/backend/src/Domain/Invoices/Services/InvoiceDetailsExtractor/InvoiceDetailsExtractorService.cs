using arolariu.Backend.Domain.Invoices.Models;

using Azure.AI.FormRecognizer.DocumentAnalysis;

using System.Collections.Generic;

namespace arolariu.Backend.Domain.Invoices.Services.InvoiceDetailsExtractor;

/// <summary>
/// Wrapper class that handles the invoice OCR'd details extraction.
/// </summary>
public static partial class InvoiceDetailsExtractorService
{
    /// <summary>
    /// Extracts the invoice items information from the analyzed receipt.
    /// The items information is stored in the <see cref="InvoiceItemsInformation"/> record struct.
    /// </summary>
    /// <param name="receipt">The analyzed receipt document.</param>
    /// <returns>The extracted invoice items information.</returns>
    public static InvoiceItemsInformation ExtractInvoiceItemsInformation(AnalyzedDocument receipt)
    {
        var invoiceItems = InvoiceItemsInformation.CreateNullInvoiceItemsInformation();

        if (receipt.Fields.TryGetValue("Items", out DocumentField? itemsField)
            && itemsField?.FieldType == DocumentFieldType.List)
        {
            var discountedItems = new Dictionary<string, decimal>();
            var boughtItems = new Dictionary<string, decimal>();

            foreach (DocumentField itemField in itemsField.Value.AsList())
            {
                if (itemField.FieldType == DocumentFieldType.Dictionary)
                {
                    var itemFields = itemField.Value.AsDictionary();
                    string? key = null;
                    double? value = null;

                    if (itemFields.TryGetValue("Description", out DocumentField? itemDescriptionField)
                        && itemDescriptionField.FieldType == DocumentFieldType.String)
                    {
                        string itemDescription = itemDescriptionField.Value.AsString();
                        key = itemDescription;
                    }

                    if (itemFields.TryGetValue("TotalPrice", out DocumentField? itemTotalPriceField)
                        && itemTotalPriceField.FieldType == DocumentFieldType.Double)
                    {
                        double itemTotalPrice = itemTotalPriceField.Value.AsDouble();
                        value = itemTotalPrice;
                    }

                    if (key != null && value != null)
                    {
                        if (value < 0) // We have identified a discount.
                        {
                            discountedItems.Add(key, (decimal)value);
                        }
                        else
                        {
                            boughtItems.Add(key, (decimal)value);
                        }
                    }
                }
            }

            invoiceItems = invoiceItems with
            {
                BoughtItems = boughtItems,
                DiscountedItems = discountedItems
            };
        }

        return invoiceItems;
    }

    /// <summary>
    /// Extracts the invoice merchant information from the analyzed receipt.
    /// The merchant information is stored in the <see cref="InvoiceMerchantInformation"/> record struct.
    /// </summary>
    /// <param name="receipt">The analyzed receipt document.</param>
    /// <returns>The extracted invoice merchant information.</returns>
    public static InvoiceMerchantInformation ExtractInvoiceMerchantInformation(AnalyzedDocument receipt)
    {
        var merchantInformation = InvoiceMerchantInformation.CreateNullInvoiceMerchantInformation();
        ExtractMerchantName(receipt, ref merchantInformation);
        ExtractMerchantAddress(receipt, ref merchantInformation);
        ExtractMerchantPhoneNumber(receipt, ref merchantInformation);
        return merchantInformation;
    }

    

    /// <summary>
    /// Extracts the invoice time information from the analyzed receipt.
    /// The time information is stored in the <see cref="InvoiceTimeInformation"/> record struct.
    /// </summary>
    /// <param name="receipt">The analyzed receipt document.</param>
    /// <returns>The extracted invoice time information.</returns>
    public static InvoiceTimeInformation ExtractInvoiceTimeInformation(AnalyzedDocument receipt)
    {
        var timeInformation = InvoiceTimeInformation.CreateNullInvoiceTimeInformation();
        ExtractIdentifiedDate(receipt, ref timeInformation);
        return timeInformation;
    }

    /// <summary>
    /// Extracts the invoice transaction information from the analyzed receipt.
    /// The transaction information is stored in the <see cref="InvoiceTransactionInformation"/> record struct.
    /// </summary>
    /// <param name="receipt">The analyzed receipt document.</param>
    /// <returns>The extracted invoice transaction information.</returns>
    public static InvoiceTransactionInformation ExtractInvoiceTransactionInformation(AnalyzedDocument receipt)
    {
        var transactionInformation = InvoiceTransactionInformation.CreateNullInvoiceTransactionInformation();
        ExtractTransactionTotal(receipt, ref transactionInformation);
        return transactionInformation;
    }
}
