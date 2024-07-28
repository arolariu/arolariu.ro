namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// The invoice category.
/// </summary>
[SuppressMessage("Naming", "CA1707:Identifiers should not contain underscores", Justification = "<Pending>")]
public enum InvoiceCategory
{
	/// <summary>
	/// Not defined = the invoice category was not defined.
	/// </summary>
	NOT_DEFINED = 0,

	/// <summary>
	/// Grocery = the invoice is a grocery invoice.
	/// </summary>
	GROCERY = 10,

	/// <summary>
	/// Fast food = the invoice is a fast food invoice.
	/// </summary>
	FAST_FOOD = 20,

	/// <summary>
	/// Home cleaning = the invoice is made of home cleaning products.
	/// </summary>
	HOME_CLEANING = 30,

	/// <summary>
	/// Car auto = the invoice is made of car parts / automotive products.
	/// </summary>
	CAR_AUTO = 40,

	/// <summary>
	/// Other = the invoice is an other invoice.
	/// </summary>
	OTHER = 9999,
}
