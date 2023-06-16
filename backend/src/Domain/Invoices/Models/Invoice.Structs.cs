using Newtonsoft.Json.Linq;

using System;
using System.Collections.Generic;

namespace arolariu.Backend.Domain.Invoices.Models;

/// <summary>
/// The invoice model's time information.
/// </summary>
[Serializable]
public record struct InvoiceTimeInformation(
    DateTime InvoiceIdentifiedDate,
    DateTime InvoiceSubmittedDate,
    TimeSpan InvoiceIdentifiedTime,
    TimeSpan InvoiceSubmittedTime)
{
    /// <summary>
    /// Creates a null instance of <see cref="InvoiceTimeInformation"/>.
    /// </summary>
    /// <returns>A null instance of <see cref="InvoiceTimeInformation"/>.</returns>
    internal static InvoiceTimeInformation CreateNullInvoiceTimeInformation()
    {
        return new InvoiceTimeInformation(
            InvoiceIdentifiedDate: DateTime.MinValue,
            InvoiceSubmittedDate: DateTime.MinValue,
            InvoiceIdentifiedTime: TimeSpan.MinValue,
            InvoiceSubmittedTime: TimeSpan.MinValue);
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
}

/// <summary>
/// The invoice model's transaction information.
/// </summary>
[Serializable]
public record struct InvoiceTransactionInformation(
    DateTimeOffset TransactionDate,
    DateTimeOffset TransactionTime,
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
            TransactionDate: DateTimeOffset.MinValue,
            TransactionTime: DateTimeOffset.MinValue,
            TransactionDescription: string.Empty,
            TransactionTotal: decimal.MinValue,
            TransactionCalories: decimal.MinValue);
    }
}

/// <summary>
/// The invoice model's items information.
/// </summary>
public record struct InvoiceItemsInformation(
    Dictionary<string, decimal> BoughtItems,
    Dictionary<string, decimal> DiscountedItems)
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
