using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;

namespace arolariu.Backend.Domain.Invoices.Models
{
    /// <summary>
    /// The invoice model's time information.
    /// </summary>
    /// <param name="InvoiceIdentifiedDate"></param>
    /// <param name="InvoiceIdentifiedTime"></param>
    /// <param name="InvoiceSubmittedDate"></param>
    /// <param name="InvoiceSubmittedTime"></param>
    [Serializable]
    public record struct InvoiceTimeInformation(
        DateTime InvoiceIdentifiedDate,
        TimeSpan InvoiceIdentifiedTime,
        DateTime InvoiceSubmittedDate,
        TimeSpan InvoiceSubmittedTime)
    {
        internal static InvoiceTimeInformation CreateNullInvoiceTimeInformation()
        {
            return new InvoiceTimeInformation(
                InvoiceIdentifiedDate: DateTime.MinValue,
                InvoiceIdentifiedTime: TimeSpan.MinValue,
                InvoiceSubmittedDate: DateTime.MinValue,
                InvoiceSubmittedTime: TimeSpan.MinValue);
        }
    }

    /// <summary>
    /// The invoice model's merchant information.
    /// </summary>
    /// <param name="MerchantName"></param>
    /// <param name="MerchantAddress"></param>
    /// <param name="MerchantPhoneNumber"></param>
    [Serializable]
    public record struct InvoiceMerchantInformation(
        string MerchantName,
        string MerchantAddress,
        string MerchantPhoneNumber)
    {
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
    /// <param name="TransactionDate"></param>
    /// <param name="TransactionTime"></param>
    /// <param name="TransactionDescription"></param>
    /// <param name="TransactionTotal"></param>
    /// <param name="TransactionCalories"></param>
    [Serializable]
    public record struct InvoiceTransactionInformation(
        DateTimeOffset TransactionDate,
        DateTimeOffset TransactionTime,
        string TransactionDescription,
        decimal TransactionTotal,
        decimal TransactionCalories)
    {
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
    /// <param name="BoughtItems"></param>
    /// <param name="DiscountedItems"></param>
    public record struct InvoiceItemsInformation(
        Dictionary<string, decimal> BoughtItems,
        Dictionary<string, decimal> DiscountedItems)
    {
        internal static InvoiceItemsInformation CreateNullInvoiceItemsInformation()
        {
            return new InvoiceItemsInformation(
                BoughtItems: new Dictionary<string, decimal>(),
                DiscountedItems: new Dictionary<string, decimal>());
        }

        /// <summary>
        /// Override for parsing the invoice items information to a JSON string.
        /// </summary>
        /// <returns></returns>
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
}
