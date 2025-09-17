namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Classifies the high-level domain purpose / composition of an invoice for analytics, enrichment heuristics and UI grouping.
/// </summary>
/// <remarks>
/// <para><b>Extensibility:</b> Maintain numeric spacing (increments of 100) when adding new concrete categories to preserve stable ordering for downstream analytical exports.</para>
/// <para><b>Sentinel:</b> <see cref="NOT_DEFINED"/> denotes an invoice whose category has not yet been user-assigned or AI-enriched and SHOULD be transient.</para>
/// <para><b>Usage:</b> Category influences recipe suggestion relevance, allergen aggregation and future budgeting dashboards.</para>
/// <para><b>Thread-safety:</b> Enum is immutable and inherently thread-safe.</para>
/// </remarks>
[SuppressMessage("Naming", "CA1707:Identifiers should not contain underscores", Justification = "Domain sentinel uses underscore for emphasis.")]
public enum InvoiceCategory
{
	/// <summary>
	/// Sentinel; category not yet assigned (pre-enrichment / pre-classification state).
	/// </summary>
	NOT_DEFINED = 0,

	/// <summary>
	/// Predominantly household food / consumable products (general pantry and grocery analytics).
	/// </summary>
	GROCERY = 100,

	/// <summary>
	/// Prepared or takeaway-oriented fast food items (low / no home preparation).
	/// </summary>
	FAST_FOOD = 200,

	/// <summary>
	/// Household cleaning / maintenance and related chemical products and supplies.
	/// </summary>
	HOME_CLEANING = 300,

	/// <summary>
	/// Automotive parts, consumables or service-related line items.
	/// </summary>
	CAR_AUTO = 400,

	/// <summary>
	/// Fallback when an invoice does not map to any defined domain category; minimize long-term usage.
	/// </summary>
	OTHER = 9999,
}
