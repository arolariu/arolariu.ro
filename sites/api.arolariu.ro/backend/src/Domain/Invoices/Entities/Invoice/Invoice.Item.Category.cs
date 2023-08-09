using System;

namespace arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

/// <summary>
/// The invoice item category enum represents the available categories for an invoice item.
/// This enum is used to categorize the invoice items.
/// The categories are used to generate the invoice statistics.
/// </summary>
[Serializable]
public enum InvoiceItemCategory
{
#pragma warning disable CS1591 // Missing XML comment for publicly visible type or member
    NOT_DEFINED = 0,
    BAKED_GOODS,
    GROCERIES,
    DAIRY,
    MEAT,
    FISH,
    FRUITS,
    VEGETABLES,
    BEVERAGES,
    ALCOHOLIC_BEVERAGES,
    TOBACCO,
    CLEANING_SUPPLIES,
    PERSONAL_CARE,
    MEDICINE,
    OTHER,
#pragma warning restore CS1591 // Missing XML comment for publicly visible type or member
}
