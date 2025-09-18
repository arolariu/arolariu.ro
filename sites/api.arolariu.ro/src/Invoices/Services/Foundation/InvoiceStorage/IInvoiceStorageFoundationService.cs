namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// Foundation (core) storage contract for persisting and retrieving <see cref="Invoice"/> aggregates.
/// </summary>
/// <remarks>
/// <para><b>Layer Role (The Standard):</b> A foundation service encapsulates direct interaction with persistence concerns (through brokers) plus
/// essential domain validations. It MUST NOT coordinate multi-aggregate workflows or invoke other foundation services (that is the orchestration layer's responsibility).</para>
/// <para><b>Responsibilities:</b>
/// <list type="bullet">
///   <item><description>Create, read, update, delete (CRUD) invoice aggregates in the underlying store.</description></item>
///   <item><description>Enforce basic domain invariants prior to persistence (e.g., non-null identifiers, monetary value ranges, collection initialization).</description></item>
///   <item><description>Propagate domain / validation failures via strongly typed exceptions (to be wrapped by higher layers).</description></item>
/// </list></para>
/// <para><b>Exclusions:</b> No cross-invoice batch operations beyond those defined; no external messaging; no enrichment / AI analysis; no business flow branching.</para>
/// <para><b>Partitioning:</b> Optional <c>userIdentifier</c> parameter represents a logical partition (e.g., Cosmos DB partition key). When provided it MUST be used
/// for scoped queries; when null the implementation MAY treat the operation as cross-partition (with potential RU / performance cost) or throw depending on policy.</para>
/// <para><b>Thread-Safety:</b> Implementations SHOULD be stateless or utilize thread-safe dependencies (brokers).</para>
/// <para><b>Idempotency:</b> Create is NOT idempotent (duplicate invoice ids should be prevented by domain uniqueness); Read/Delete are idempotent relative to state outcome.</para>
/// </remarks>
public interface IInvoiceStorageFoundationService
{
  #region Store Invoice Object API
  /// <summary>
  /// Persists a new <see cref="Invoice"/> aggregate.
  /// </summary>
  /// <remarks>
  /// <para><b>Validation:</b> Ensures invoice id is non-empty, required collections initialized, and monetary totals non-negative.</para>
  /// <para><b>Failure Modes:</b> Throws validation exception on invariant breach; throws dependency / dependency validation exceptions on broker failures or conflicts.</para>
  /// </remarks>
  /// <param name="invoice">Fully formed invoice aggregate to persist.</param>
  /// <param name="userIdentifier">Optional partition / tenant context for the invoice (acts as partition key).</param>
  /// <returns>Asynchronous task.</returns>
  /// <exception cref="ArgumentNullException">If <paramref name="invoice"/> is null.</exception>
  Task CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null);
  #endregion

  #region Read Invoice Object API
  /// <summary>
  /// Retrieves a single invoice by its identifier (and optional partition).
  /// </summary>
  /// <remarks>
  /// <para><b>Return:</b> Returns the invoice or <c>null</c> if not found (depending on implementation; may alternatively throw a not-found validation exception per policy).</para>
  /// <para><b>Performance:</b> Single point read; SHOULD leverage partition for optimal cost.</para>
  /// </remarks>
  /// <param name="identifier">Invoice aggregate identifier.</param>
  /// <param name="userIdentifier">Optional partition / tenant context.</param>
  /// <returns>Invoice instance or null.</returns>
  Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier = null);
  #endregion

  #region Read Invoice Objects API
  /// <summary>
  /// Enumerates all invoices for a given partition (or across partitions if none supplied).
  /// </summary>
  /// <remarks>
  /// <para><b>Pagination:</b> Not yet implemented; large result sets may incur high RU / memory usage (backlog item).</para>
  /// <para><b>Soft Delete:</b> Implementations SHOULD filter out soft-deleted invoices unless a diagnostic flag is added in future.</para>
  /// </remarks>
  /// <param name="userIdentifier">Optional partition / tenant context.</param>
  /// <returns>Enumerable collection (empty if none).</returns>
  Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid? userIdentifier = null);
  #endregion

  #region Update Invoice Object API
  /// <summary>
  /// Replaces an existing invoice with updated state.
  /// </summary>
  /// <remarks>
  /// <para><b>Preconditions:</b> Target invoice must exist; invariants on updated aggregate re-validated.</para>
  /// <para><b>Concurrency:</b> No optimistic concurrency (ETag) yet; future enhancement may add concurrency token handling.</para>
  /// </remarks>
  /// <param name="updatedInvoice">Proposed new aggregate state.</param>
  /// <param name="invoiceIdentifier">Identity of the invoice being updated (must match <c>updatedInvoice.id</c> if enforced).</param>
  /// <param name="userIdentifier">Optional partition / tenant context.</param>
  /// <returns>Updated invoice instance.</returns>
  Task<Invoice> UpdateInvoiceObject(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier = null);
  #endregion

  #region Delete Invoice Object API
  /// <summary>
  /// Performs a logical or physical delete (implementation-defined) of an invoice.
  /// </summary>
  /// <remarks>
  /// <para><b>Soft Delete Policy:</b> If soft delete is implemented, method SHOULD mark state and retain for audit; otherwise physically remove.</para>
  /// <para><b>Idempotency:</b> Multiple invocations with same identifier yield same terminal state (absent or marked deleted).</para>
  /// </remarks>
  /// <param name="identifier">Invoice identifier.</param>
  /// <param name="userIdentifier">Optional partition / tenant context.</param>
  /// <returns>Asynchronous task.</returns>
  Task DeleteInvoiceObject(Guid identifier, Guid? userIdentifier = null);
  #endregion
}
