namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// Orchestration layer contract for coordinating invoice-related workflows across foundation services and (optionally) processing concerns.
/// </summary>
/// <remarks>
/// <para><b>Layer Role (The Standard):</b> Orchestration services compose one or more foundation services, apply cross-cutting policies
/// (validation sequencing, exception classification, retry / resilience hooks), and prepare data for upstream presentation layers.
/// They MUST NOT contain raw persistence calls (delegated to foundation) nor heavy computational enrichment (delegated to processing).</para>
/// <para><b>Responsibilities:</b>
/// <list type="bullet">
///   <item><description>Sequence domain operations (e.g., validate → store → analyze) while maintaining clear transactional boundaries.</description></item>
///   <item><description>Translate low-level dependency / validation exceptions into higher-order orchestration exceptions (per The Standard).</description></item>
///   <item><description>Enforce partition / ownership rules by propagating or asserting <c>userIdentifier</c>.</description></item>
///   <item><description>Invoke processing / analysis workflows when explicitly requested (e.g., AnalyzeInvoiceWithOptions).</description></item>
/// </list></para>
/// <para><b>Exclusions:</b> No direct HTTP / transport awareness, no UI mapping, no persistence broker usage directly, no long-running state machines
/// (those belong to a higher saga / workflow coordinator if introduced).</para>
/// <para><b>Idempotency:</b> Read / delete operations are naturally idempotent; create and update operations SHOULD guard against duplicate or stale writes
/// (future: optimistic concurrency tokens).</para>
/// <para><b>Error Strategy:</b> Implementations SHOULD capture foundation exceptions and wrap them into orchestration-level exceptions to keep vertical
/// layering separable for observability and policy (e.g., global exception middleware).</para>
/// </remarks>
public interface IInvoiceOrchestrationService
{
	/// <summary>
	/// Executes an analysis workflow for a specific invoice using the supplied option flags.
	/// </summary>
	/// <remarks>
	/// <para><b>Behavior:</b> Orchestrates retrieval (if not already loaded downstream), validation, then delegates enrichment /
	/// classification steps to processing / foundation analysis components.</para>
	/// <para><b>Side Effects:</b> May update persisted invoice state if analysis results are persisted (future enhancement).
	/// Currently assumed to be synchronous; backlog: promote to async operation resource.</para>
	/// <para><b>Idempotency:</b> Re-running with identical inputs SHOULD yield semantically equivalent enrichment unless time‑variant
	/// data sources are consulted (e.g., external tax rates).</para>
	/// </remarks>
	/// <param name="options">Directive flags controlling which analysis / enrichment steps to perform (MUST NOT be null).</param>
	/// <param name="invoiceIdentifier">Target invoice identifier (MUST reference an existing invoice).</param>
	/// <param name="userIdentifier">Optional tenant / partition scope (enforced for ownership isolation).</param>
	/// <returns>Asynchronous task.</returns>
	/// <exception cref="ArgumentNullException">Thrown if <paramref name="options"/> is null.</exception>
	/// <exception cref="InvalidOperationException">Thrown if invoice not found or fails pre-analysis invariants.</exception>
	public Task AnalyzeInvoiceWithOptions(AnalysisOptions options, Guid invoiceIdentifier, Guid? userIdentifier = null);

	#region Implements the Invoice Storage Foundation Service
	#region Create Invoice API
	/// <summary>
	/// Creates (persists) a new invoice aggregate via the underlying foundation storage service.
	/// </summary>
	/// <remarks>
	/// <para><b>Workflow:</b> Validate inbound aggregate → delegate to foundation storage → optionally trigger post-create hooks (future: events).</para>
	/// <para><b>Failure Modes:</b> Validation exceptions for invariant breaches; dependency / dependency validation exceptions surfaced from foundation layer and wrapped by implementation.</para>
	/// </remarks>
	/// <param name="invoice">Fully initialized invoice aggregate to persist.</param>
	/// <param name="userIdentifier">Optional tenant / partition scope.</param>
	/// <returns>Persisted invoice aggregate (may contain persistence-generated fields).</returns>
	public Task<Invoice> CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null);
	#endregion

	#region Read Invoice API
	/// <summary>
	/// Retrieves a single invoice aggregate by identifier.
	/// </summary>
	/// <remarks>
	/// <para><b>Behavior:</b> Delegates to foundation storage; may augment with orchestration-level caching or access policy enforcement in future.</para>
	/// </remarks>
	/// <param name="identifier">Invoice identifier.</param>
	/// <param name="userIdentifier">Optional tenant / partition scope.</param>
	/// <returns>Invoice instance (null or exception if not found per implementation policy).</returns>
	public Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier = null);
	#endregion

	#region Read Invoices API
	/// <summary>
	/// Retrieves all invoices for an optional partition scope.
	/// </summary>
	/// <remarks>
	/// <para><b>Pagination:</b> Not supported yet (backlog). Implementations SHOULD avoid unbounded materialization where possible.</para>
	/// </remarks>
	/// <param name="userIdentifier">Optional tenant / partition scope.</param>
	/// <returns>Sequence of invoices (empty if none).</returns>
	public Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid? userIdentifier = null);
	#endregion

	#region Update Invoice API
	/// <summary>
	/// Updates (replaces) an existing invoice aggregate.
	/// </summary>
	/// <remarks>
	/// <para><b>Validation:</b> Ensures identifier consistency (argument id vs aggregate id if enforced) and domain invariants prior to persistence.</para>
	/// <para><b>Concurrency:</b> No ETag support yet; potential overwrite of concurrent updates (backlog: optimistic concurrency).</para>
	/// </remarks>
	/// <param name="updatedInvoice">Proposed new invoice state.</param>
	/// <param name="invoiceIdentifier">Identifier of invoice being updated.</param>
	/// <param name="userIdentifier">Optional tenant / partition scope.</param>
	/// <returns>Updated invoice instance.</returns>
	public Task<Invoice> UpdateInvoiceObject(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Delete Invoice API
	/// <summary>
	/// Deletes (logical or physical depending on foundation strategy) a single invoice.
	/// </summary>
	/// <remarks>
	/// <para><b>Idempotency:</b> Repeated calls yield stable terminal state.</para>
	/// <para><b>Side Effects:</b> No cascading delete in orchestration layer (future: explicit cascade policy / event emission).</para>
	/// </remarks>
	/// <param name="identifier">Invoice identifier.</param>
	/// <param name="userIdentifier">Optional tenant / partition scope.</param>
	/// <returns>Asynchronous task.</returns>
	public Task DeleteInvoiceObject(Guid identifier, Guid? userIdentifier = null);
	#endregion
	#endregion
}
