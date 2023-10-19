using System;

namespace arolariu.Backend.Domain.Invoices.Entities.Products;

/// <summary>
/// The invoice item category enum represents the available categories for an invoice item.
/// This enum is used to categorize the invoice items.
/// The categories are used to generate the invoice statistics.
/// </summary>
[Serializable]
public enum ProductCategory
{
#pragma warning disable CS1591 // Missing XML comment for publicly visible type or member
    NOT_DEFINED = 0,
    BAKED_GOODS = 10,
    GROCERIES = 20,
    DAIRY = 30,
    MEAT = 40,
    FISH = 50,
    FRUITS = 60,
    VEGETABLES = 70,
    BEVERAGES = 80,
    ALCOHOLIC_BEVERAGES = 90,
    TOBACCO = 100,
    CLEANING_SUPPLIES = 110,
    PERSONAL_CARE = 120,
    MEDICINE = 130,
    OTHER = 9999,
#pragma warning restore CS1591 // Missing XML comment for publicly visible type or member
}
