using System;

namespace arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

/// <summary>
/// The invoice merchant category enum represents the available categories for an invoice merchant.
/// This enum is used to categorize the invoice merchants.
/// The categories are used to generate the invoice statistics.
/// </summary>
[Serializable]
public enum InvoiceMerchantCategory
{
#pragma warning disable CS1591 // Missing XML comment for publicly visible type or member
    NOT_DEFINED = 0,
    LOCAL_SHOP,
    SUPERMARKET,
    HYPERMARKET,
    ONLINE_SHOP,
    OTHER,
#pragma warning restore CS1591 // Missing XML comment for publicly visible type or member
}
