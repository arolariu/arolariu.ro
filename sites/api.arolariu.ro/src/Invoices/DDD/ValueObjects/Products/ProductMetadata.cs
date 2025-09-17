namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Operational metadata flags describing mutable processing / workflow state for a product line item.
/// </summary>
/// <remarks>
/// <para><b>Scope:</b> These flags are owned by the parent product and persisted inline (embedded) in the invoice document.</para>
/// <para><b>Semantics:</b></para>
/// <list type="bullet">
///   <item><description><c>IsEdited</c>: User (or automated enrichment) has modified one or more product fields after initial ingestion.</description></item>
///   <item><description><c>IsComplete</c>: Product line considered finalized (sufficient data quality for analytics / export).</description></item>
///   <item><description><c>IsSoftDeleted</c>: Product logically removed but retained for audit; parent invoice filters these at presentation layers.</description></item>
/// </list>
/// <para><b>Thread-safety:</b> Not thread-safe; modifications must occur within aggregate mutation workflow.</para>
/// </remarks>
[ExcludeFromCodeCoverage]
public record struct ProductMetadata
{
	/// <summary>Indicates the product has been user- or system-modified post-ingestion.</summary>
	/// <remarks><para>Used to surface UI indicators and enable differential audit logging.</para></remarks>
	public bool IsEdited { get; set; }

	/// <summary>Signals that required enrichment / validation steps have completed for this product.</summary>
	/// <remarks><para>Downstream analytics may exclude products where this flag is false to avoid skew.</para></remarks>
	public bool IsComplete { get; set; }

	/// <summary>Logical deletion marker (soft delete) retaining historical context.</summary>
	/// <remarks><para>Soft-deleted products remain persisted; aggregate-level queries are expected to exclude them unless explicitly overridden.</para></remarks>
	public bool IsSoftDeleted { get; set; }
}
