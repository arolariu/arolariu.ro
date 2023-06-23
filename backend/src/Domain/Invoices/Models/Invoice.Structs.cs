using Newtonsoft.Json.Linq;

using System;
using System.Collections.Generic;

namespace arolariu.Backend.Domain.Invoices.Models;

/// <summary>
/// The invoice model's time information.
/// </summary>
[Serializable]
public record struct InvoiceTimeInformation(
    DateTimeOffset InvoiceSubmittedDate,
    DateTimeOffset InvoiceIdentifiedDate)
{
    /// <summary>
    /// Creates a null instance of <see cref="InvoiceTimeInformation"/>.
    /// </summary>
    /// <returns>A null instance of <see cref="InvoiceTimeInformation"/>.</returns>
    internal static InvoiceTimeInformation CreateNullInvoiceTimeInformation()
    {
        return new InvoiceTimeInformation(
            InvoiceSubmittedDate: DateTime.MinValue,
            InvoiceIdentifiedDate: DateTime.MinValue);
    }

    internal static bool CheckInvoiceTimeInformationStructIsNull(InvoiceTimeInformation timeInformation)
    {
        return
            timeInformation.InvoiceSubmittedDate == DateTime.MinValue ||
            timeInformation.InvoiceIdentifiedDate == DateTime.MinValue;
    }
}

/// <summary>
/// The invoice model's merchant information.
/// </summary>
[Serializable]
public record struct InvoiceMerchantInformation(
    string MerchantName,
    string MerchantAddress,
    string MerchantPhoneNumber)
{
    /// <summary>
    /// Creates a null instance of <see cref="InvoiceMerchantInformation"/>.
    /// </summary>
    /// <returns>A null instance of <see cref="InvoiceMerchantInformation"/>.</returns>
    internal static InvoiceMerchantInformation CreateNullInvoiceMerchantInformation()
    {
        return new InvoiceMerchantInformation(
            MerchantName: string.Empty,
            MerchantAddress: string.Empty,
            MerchantPhoneNumber: string.Empty);
    }

    internal static bool CheckInvoiceMerchantInformationStructIsNull(InvoiceMerchantInformation merchantInformation)
    {
        return
            string.IsNullOrEmpty(merchantInformation.MerchantName) ||
            string.IsNullOrEmpty(merchantInformation.MerchantAddress) ||
            string.IsNullOrEmpty(merchantInformation.MerchantPhoneNumber);
    }
}

/// <summary>
/// The invoice model's transaction information.
/// </summary>
[Serializable]
public record struct InvoiceTransactionInformation(
    string TransactionDescription,
    decimal TransactionTotal,
    decimal TransactionCalories)
{
    /// <summary>
    /// Creates a null instance of <see cref="InvoiceTransactionInformation"/>.
    /// </summary>
    /// <returns>A null instance of <see cref="InvoiceTransactionInformation"/>.</returns>
    internal static InvoiceTransactionInformation CreateNullInvoiceTransactionInformation()
    {
        return new InvoiceTransactionInformation(
            TransactionDescription: string.Empty,
            TransactionTotal: decimal.MinValue,
            TransactionCalories: decimal.MinValue);
    }

    internal static bool CheckInvoiceTransactionInformationStructIsNull(InvoiceTransactionInformation transactionInformation)
    {
        return
            string.IsNullOrEmpty(transactionInformation.TransactionDescription) &&
            transactionInformation.TransactionTotal == decimal.MinValue &&
            transactionInformation.TransactionCalories == decimal.MinValue;
    }
}

/// <summary>
/// Invoice metadata struct
/// </summary>
/// <param name="MetadataBag"></param>
public record struct InvoiceMetadata(
      IDictionary<string, object> MetadataBag)
{
    internal static InvoiceMetadata CreateNullInvoiceMetadata()
    {
        return new InvoiceMetadata(
            MetadataBag: new Dictionary<string, object>());
    }

    internal InvoiceMetadata AddMetadata(KeyValuePair<string, object> metadata)
    {
        var newMetadataBag = new Dictionary<string, object>(MetadataBag)
        {
            { metadata.Key, metadata.Value }
        };

        return this with { MetadataBag = newMetadataBag };
    }

    internal InvoiceMetadata RemoveMedata(string key)
    {
        var newMetadataBag = new Dictionary<string, object>(MetadataBag);
        newMetadataBag.Remove(key);

        return this with { MetadataBag = newMetadataBag };
    }

    internal static bool VerifyInvoiceMetadataStructIsNull(InvoiceMetadata invoiceMetadata)
    {
        return invoiceMetadata.MetadataBag.Count == 0;
    }
}

/// <summary>
/// The invoice model's items information.
/// </summary>
public record struct InvoiceItemsInformation(
    IDictionary<string, decimal> BoughtItems,
    IDictionary<string, decimal> DiscountedItems)
{
    /// <summary>
    /// Creates a null instance of <see cref="InvoiceItemsInformation"/>.
    /// </summary>
    /// <returns>A null instance of <see cref="InvoiceItemsInformation"/>.</returns>
    internal static InvoiceItemsInformation CreateNullInvoiceItemsInformation()
    {
        return new InvoiceItemsInformation(
            BoughtItems: new Dictionary<string, decimal>(),
            DiscountedItems: new Dictionary<string, decimal>());
    }

    internal static bool CheckInvoiceItemsInformationStructIsNull(InvoiceItemsInformation itemsInformation)
    {
        return
            itemsInformation.BoughtItems?.Count == 0 ||
            itemsInformation.DiscountedItems?.Count == 0;
    }

    /// <summary>
    /// Overrides the <see cref="Object.ToString"/> method to parse the invoice items information to a JSON string.
    /// </summary>
    /// <returns>A JSON string representing the invoice items information.</returns>
    public override readonly string ToString()
    {
        JObject keyValuePairs = new JObject
        {
            { nameof(BoughtItems), JObject.FromObject(BoughtItems) },
            { nameof(DiscountedItems), JObject.FromObject(DiscountedItems) }
        };
        return keyValuePairs.ToString();
    }
}

/// <summary>
/// Represents the status of an invoice.
/// </summary>
public record struct InvoiceStatus(
    bool IsCompleteInvoice,
    int InvoiceHitCount,
    bool IsAnalyzed,
    DateTimeOffset AnalyzedDate,
    DateTimeOffset InvoiceCreationDate,
    DateTimeOffset InvoiceLastModifiedDate
)
{

    internal static InvoiceStatus CreateNullInvoiceStatus()
    {
        return new InvoiceStatus(
            IsCompleteInvoice: false,
            InvoiceHitCount: 0,
            IsAnalyzed: false,
            AnalyzedDate: DateTime.MinValue,
            InvoiceCreationDate: DateTime.MinValue,
            InvoiceLastModifiedDate: DateTime.MinValue);
    }

    internal static bool CheckInvoiceStatusStructIsNull(InvoiceStatus invoiceStatus)
    {
        return
            !invoiceStatus.IsCompleteInvoice &&
            !invoiceStatus.IsAnalyzed &&
            invoiceStatus.InvoiceHitCount == 0 &&
            invoiceStatus.AnalyzedDate == DateTime.MinValue &&
            invoiceStatus.InvoiceCreationDate == DateTime.MinValue &&
            invoiceStatus.InvoiceLastModifiedDate == DateTime.MinValue;
    }
}

