using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Products;

/// <summary>
/// The invoice item category enum represents the available categories for an invoice item.
/// This enum is used to categorize the invoice items.
/// The categories are used to generate the invoice statistics.
/// </summary>
[SuppressMessage("Naming", "CA1707:Identifiers should not contain underscores", Justification = "<Pending>")]
public enum ProductCategory
{
    /// <summary>
    /// Not defined = the item category was not defined.
    /// </summary>
    NOT_DEFINED = 0,

    /// <summary>
    /// Bakery = the item is a baked good.
    /// </summary>
    BAKED_GOODS = 10,

    /// <summary>
    /// Groceries = the item is a grocery.
    /// </summary>
    GROCERIES = 20,

    /// <summary>
    /// Dairy = the item is a dairy product.
    /// </summary>
    DAIRY = 30,

    /// <summary>
    /// Meat = the item is a meat product.
    /// </summary>
    MEAT = 40,

    /// <summary>
    /// Fish = the item is a fish product.
    /// </summary>
    FISH = 50,

    /// <summary>
    /// Fruit = the item is a fruit product.
    /// </summary>
    FRUITS = 60,

    /// <summary>
    /// Vegetables = the item is a vegetable product.
    /// </summary>
    VEGETABLES = 70,

    /// <summary>
    /// Beverages = the item is a beverage product.
    /// </summary>
    BEVERAGES = 80,

    /// <summary>
    /// Alcoholic beverages = the item is an alcoholic beverage product.
    /// </summary>
    ALCOHOLIC_BEVERAGES = 90,

    /// <summary>
    /// Tobacco = the item is a tobacco product.
    /// </summary>
    TOBACCO = 100,

    /// <summary>
    /// Cleaning supplies = the item is a cleaning supply product.
    /// </summary>
    CLEANING_SUPPLIES = 110,

    /// <summary>
    /// Personal care = the item is a personal care product.
    /// </summary>
    PERSONAL_CARE = 120,

    /// <summary>
    /// Medicine = the item is a medicine product.
    /// </summary>
    MEDICINE = 130,

    /// <summary>
    /// Other = the item is not defined.
    /// </summary>
    OTHER = 9999,
}
