namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using System.Diagnostics.CodeAnalysis;

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
	BAKED_GOODS = 100,

	/// <summary>
	/// Groceries = the item is a grocery.
	/// </summary>
	GROCERIES = 200,

	/// <summary>
	/// Dairy = the item is a dairy product.
	/// </summary>
	DAIRY = 300,

	/// <summary>
	/// Meat = the item is a meat product.
	/// </summary>
	MEAT = 400,

	/// <summary>
	/// Fish = the item is a fish product.
	/// </summary>
	FISH = 500,

	/// <summary>
	/// Fruit = the item is a fruit product.
	/// </summary>
	FRUITS = 600,

	/// <summary>
	/// Vegetables = the item is a vegetable product.
	/// </summary>
	VEGETABLES = 700,

	/// <summary>
	/// Beverages = the item is a beverage product.
	/// </summary>
	BEVERAGES = 800,

	/// <summary>
	/// Alcoholic beverages = the item is an alcoholic beverage product.
	/// </summary>
	ALCOHOLIC_BEVERAGES = 900,

	/// <summary>
	/// Tobacco = the item is a tobacco product.
	/// </summary>
	TOBACCO = 1000,

	/// <summary>
	/// Cleaning supplies = the item is a cleaning supply product.
	/// </summary>
	CLEANING_SUPPLIES = 1100,

	/// <summary>
	/// Personal care = the item is a personal care product.
	/// </summary>
	PERSONAL_CARE = 1200,

	/// <summary>
	/// Medicine = the item is a medicine product.
	/// </summary>
	MEDICINE = 1300,

	/// <summary>
	/// Other = the item is not defined.
	/// </summary>
	OTHER = 9999,
}
