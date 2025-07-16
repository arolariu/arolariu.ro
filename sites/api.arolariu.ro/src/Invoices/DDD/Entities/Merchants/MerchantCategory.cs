namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// The invoice merchant category enum represents the available categories for an invoice merchant.
/// This enum is used to categorize the invoice merchants.
/// The categories are used to generate the invoice statistics.
/// </summary>
[SuppressMessage("Naming", "CA1707:Identifiers should not contain underscores", Justification = "<Pending>")]
public enum MerchantCategory
{
	/// <summary>
	/// Not defined = the merchant category was not defined.
	/// </summary>
	NOT_DEFINED = 0,

	/// <summary>
	/// Local shop = the merchant is a local shop.
	/// </summary>
	LOCAL_SHOP = 100,

	/// <summary>
	/// Supermarket = the merchant is a supermarket.
	/// </summary>
	SUPERMARKET = 200,

	/// <summary>
	/// Hypermarket = the merchant is a hypermarket.
	/// </summary>
	HYPERMARKET = 300,

	/// <summary>
	/// Online shop = the merchant is an online shop.
	/// </summary>
	ONLINE_SHOP = 400,

	/// <summary>
	/// Other = the merchant is not defined.
	/// </summary>
	OTHER = 9999,
}
