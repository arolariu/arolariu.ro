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
	/// Personal = the invoice is a personal invoice.
	/// </summary>
	PERSONAL = 10,

	/// <summary>
	/// Other = the invoice is an other invoice.
	/// </summary>
	OTHER = 9999,
}
