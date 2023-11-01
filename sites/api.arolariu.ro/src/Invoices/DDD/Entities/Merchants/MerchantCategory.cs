using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// The invoice merchant category enum represents the available categories for an invoice merchant.
/// This enum is used to categorize the invoice merchants.
/// The categories are used to generate the invoice statistics.
/// </summary>
[Serializable]
[SuppressMessage("Naming", "CA1707:Identifiers should not contain underscores", Justification = "<Pending>")]
public enum MerchantCategory
{
#pragma warning disable CS1591 // Missing XML comment for publicly visible type or member
    NOT_DEFINED = 0,
    LOCAL_SHOP = 10,
    SUPERMARKET = 20,
    HYPERMARKET = 30,
    ONLINE_SHOP = 40,
    OTHER = 9999,
#pragma warning restore CS1591 // Missing XML comment for publicly visible type or member
}
