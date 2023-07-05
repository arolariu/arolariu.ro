using arolariu.Backend.Core.Domain.Invoices.Models;

using Azure.AI.FormRecognizer.DocumentAnalysis;

using System;

namespace arolariu.Backend.Domain.Invoices.Services.InvoiceDetailsExtractor;

/// <summary>
/// Class that handles the invoice OCR'd details validation.
/// </summary>
public static partial class InvoiceDetailsExtractorService
{
    #region Invoice Merchant Information internal methods
    internal static void ExtractMerchantName(AnalyzedDocument receipt, ref InvoiceMerchantInformation merchantInformation)
    {
        if (receipt.Fields.TryGetValue("MerchantName", out DocumentField? merchantNameField)
                    && merchantNameField?.FieldType == DocumentFieldType.String)
        {
            string merchantName = merchantNameField.Value.AsString();
            merchantInformation = merchantInformation with { MerchantName = merchantName };
        }
    }

    internal static void ExtractMerchantAddress(AnalyzedDocument receipt, ref InvoiceMerchantInformation merchantInformation)
    {
        if (receipt.Fields.TryGetValue("MerchantAddress", out DocumentField? merchantAddressField)
            && merchantAddressField?.FieldType == DocumentFieldType.String)
        {
            string merchantAddress = merchantAddressField.Value.AsString();
            merchantInformation = merchantInformation with { MerchantAddress = merchantAddress };
        }
    }

    internal static void ExtractMerchantPhoneNumber(AnalyzedDocument receipt, ref InvoiceMerchantInformation merchantInformation)
    {
        if (receipt.Fields.TryGetValue("MerchantPhoneNumber", out DocumentField? merchantPhoneNumberField)
            && merchantPhoneNumberField?.FieldType == DocumentFieldType.PhoneNumber)
        {
            string merchantPhoneNumber = merchantPhoneNumberField.Value.AsPhoneNumber();
            merchantInformation = merchantInformation with { MerchantPhoneNumber = merchantPhoneNumber };
        }
    }
    #endregion

    #region Invoice Time Information internal methods
    internal static void ExtractIdentifiedDate(AnalyzedDocument receipt, ref InvoiceTimeInformation timeInformation)
    {
        DateTimeOffset invoiceDate = DateTimeOffset.MinValue;

        if (receipt.Fields.TryGetValue("TransactionDate", out DocumentField? transactionDateField)
                && transactionDateField?.FieldType == DocumentFieldType.Date)
        {
            var transactionDate = transactionDateField.Value.AsDate();
            invoiceDate = transactionDate.Date;
        }

        if (receipt.Fields.TryGetValue("TransactionTime", out DocumentField? transactionTimeField)
                && transactionTimeField?.FieldType == DocumentFieldType.Time)
        {
            var transactionTime = transactionTimeField.Value.AsTime();
            invoiceDate = invoiceDate.Add(transactionTime);
        }

        timeInformation = timeInformation with { InvoiceIdentifiedDate = invoiceDate };
        timeInformation = timeInformation with { InvoiceSubmittedDate = DateTimeOffset.UtcNow };
    }
    #endregion

    #region Invoice Transaction Information internal methods
    internal static void ExtractTransactionTotal(AnalyzedDocument receipt, ref InvoiceTransactionInformation transactionInformation)
    {
        if (receipt.Fields.TryGetValue("Total", out DocumentField? totalField) 
                && totalField?.FieldType == DocumentFieldType.Double)
        {
            double total = totalField.Value.AsDouble();
            transactionInformation = transactionInformation with { TransactionTotal = (decimal)total };
        }
    }
    #endregion
}
