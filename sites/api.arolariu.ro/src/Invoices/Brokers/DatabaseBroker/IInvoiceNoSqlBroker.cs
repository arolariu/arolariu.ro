namespace arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Low-level (broker) persistence contract for invoice and merchant aggregates backed by Azure Cosmos DB (NoSQL).
/// </summary>
/// <remarks>
/// <para><b>Role (The Standard):</b> A broker is a thin abstraction over an external dependency (Cosmos DB). It exposes primitive CRUD /
/// query operations with minimal translation. It MUST NOT implement domain validation, cross-aggregate orchestration, authorization,
/// business workflow branching, or exception classification beyond direct dependency errors.</para>
/// <para><b>Responsibilities:</b>
/// <list type="bullet">
///   <item><description>Persist (create / upsert) invoice and merchant aggregates.</description></item>
///   <item><description>Retrieve single or multiple aggregates (optionally partition-scoped for RU efficiency).</description></item>
///   <item><description>Apply soft delete semantics for invoices (and future merchants) by flagging rather than removing.</description></item>
/// </list></para>
/// <para><b>Exclusions:</b> No invariant checking, no ownership / tenancy authorization, no retry / circuit breaker policy (to be added via
/// delegating handlers or higher resilience layer), no pagination abstraction, no projection shaping (callers handle filtering / shaping).</para>
/// <para><b>Partitioning:</b> Invoices partitioned by <c>UserIdentifier</c>; merchants by <c>ParentCompanyId</c>. Overloads lacking an explicit
/// partition key perform cross-partition (fan-out) operations and SHOULD be reserved for administrative / analytical scenarios due to higher RU cost.</para>
/// <para><b>Soft Delete (Invoices):</b> Implemented via <c>IsSoftDeleted</c> flags on invoice and contained products. Broker read methods return only
/// non-soft-deleted documents. Bulk hard-deletion is intentionally avoided for audit and recovery concerns (future backlog: retention policy enforcement).</para>
/// <para><b>Idempotency:</b>
/// <list type="bullet">
///   <item><description>Create operations are NOT idempotent (duplicate IDs depend on upstream id assignment strategy).</description></item>
///   <item><description>Soft-delete operations are idempotent (repeated calls yield same terminal state).</description></item>
///   <item><description>Read operations are naturally idempotent.</description></item>
/// </list></para>
/// <para><b>Concurrency:</b> No optimistic concurrency (ETag) handling is implemented yet (backlog: introduce access conditions to prevent lost updates).</para>
/// <para><b>Performance Notes:</b> Prefer partition-aware overloads. Cross-partition queries should be monitored (add RU telemetry in higher layers).
/// Upsert patterns may incur additional RU vs targeted replace (evaluate once concurrency tokens introduced).</para>
/// <para><b>Thread Safety:</b> Implementations (e.g., EF Core DbContext wrapper) are typically NOT thread-safe; consumers should scope instances per unit-of-work.</para>
/// <para><b>Cancellation:</b> No cancellation tokens yet (backlog: add overloads with <c>CancellationToken</c> to support request abort and timeouts).</para>
/// <para><b>Backlog:</b> Pagination / continuation tokens, optimistic concurrency, projection queries (selective field retrieval),
/// bulk operations (transactional batch for co-partitioned items), telemetry hooks, and soft-delete for merchants.</para>
/// </remarks>
public interface IInvoiceNoSqlBroker
{
  #region Invoice Storage Broker

  /// <summary>
  /// Persists a new invoice document.
  /// </summary>
  /// <remarks>
  /// <para>Asynchronous I/O-bound single write operation. Assumes the invoice aggregate has been fully validated upstream.</para>
  /// </remarks>
  /// <param name="invoice">Fully populated invoice aggregate (identity may be reassigned by upstream factory prior to call).</param>
  /// <returns>The persisted invoice including any storage-generated metadata.</returns>
  /// <exception cref="ArgumentNullException">Thrown if <paramref name="invoice"/> is null.</exception>
  ValueTask<Invoice> CreateInvoiceAsync(Invoice invoice);

  /// <summary>
  /// Retrieves a single invoice by identifier using a cross-partition (greedy) lookup.
  /// </summary>
  /// <remarks>
  /// <para>Performs a non-partition-scoped query (higher RU cost). Use the partition-aware overload when the user / owner identifier is available.</para>
  /// <para>Returns null when not found or soft-deleted.</para>
  /// </remarks>
  /// <param name="invoiceIdentifier">Invoice aggregate identity (GUID).</param>
  /// <returns>The matching invoice or null.</returns>
  ValueTask<Invoice?> ReadInvoiceAsync(Guid invoiceIdentifier);

  /// <summary>
  /// Retrieves a single invoice by identifier scoped to its partition (preferred form).
  /// </summary>
  /// <remarks>
  /// <para>Provides efficient point read when both invoice id and owner (<paramref name="userIdentifier"/>) are known.</para>
  /// <para>Returns null when not found or soft-deleted.</para>
  /// </remarks>
  /// <param name="invoiceIdentifier">Invoice aggregate identity (GUID).</param>
  /// <param name="userIdentifier">Owner / partition key.</param>
  /// <returns>The matching invoice or null.</returns>
  ValueTask<Invoice?> ReadInvoiceAsync(Guid invoiceIdentifier, Guid userIdentifier);

  /// <summary>
  /// Lists all non soft-deleted invoices across all partitions (cross-partition enumeration).
  /// </summary>
  /// <remarks>
  /// <para>Potentially expensive operation; intended for administrative or analytical scenarios, not per-request user flows.</para>
  /// </remarks>
  /// <returns>An enumerable of invoices (may be empty).</returns>
  ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync();

  /// <summary>
  /// Lists all non soft-deleted invoices for a specific user/partition.
  /// </summary>
  /// <param name="userIdentifier">Partition key / owner identity.</param>
  /// <returns>An enumerable of invoices (may be empty).</returns>
  ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync(Guid userIdentifier);

  /// <summary>
  /// Replaces (upserts) an invoice by identifier (partition inferred from <paramref name="updatedInvoice"/>).
  /// </summary>
  /// <remarks>
  /// <para>Assumes <paramref name="updatedInvoice"/> carries the correct <c>UserIdentifier</c>. Does not perform concurrency (ETag) checks.</para>
  /// </remarks>
  /// <param name="invoiceIdentifier">Target invoice identity.</param>
  /// <param name="updatedInvoice">Updated invoice aggregate snapshot.</param>
  /// <returns>The persisted invoice after update.</returns>
  /// <exception cref="ArgumentNullException">Thrown if <paramref name="updatedInvoice"/> is null.</exception>
  ValueTask<Invoice> UpdateInvoiceAsync(Guid invoiceIdentifier, Invoice updatedInvoice);

  /// <summary>
  /// Replaces (upserts) an invoice using current and updated aggregate snapshots.
  /// </summary>
  /// <remarks>
  /// <para><paramref name="currentInvoice"/> is not modified; only <paramref name="updatedInvoice"/> is persisted. No optimistic concurrency token applied.</para>
  /// </remarks>
  /// <param name="currentInvoice">Current persisted invoice snapshot (not validated here).</param>
  /// <param name="updatedInvoice">Updated invoice aggregate snapshot.</param>
  /// <returns>The persisted invoice after update.</returns>
  /// <exception cref="ArgumentNullException">Thrown if <paramref name="currentInvoice"/> or <paramref name="updatedInvoice"/> is null.</exception>
  ValueTask<Invoice> UpdateInvoiceAsync(Invoice currentInvoice, Invoice updatedInvoice);

  /// <summary>
  /// Soft-deletes an invoice by identifier (cross-partition lookup).
  /// </summary>
  /// <remarks>
  /// <para>Marks invoice and contained products as soft-deleted if found. No-op when not found.</para>
  /// </remarks>
  /// <param name="invoiceIdentifier">Invoice identity.</param>
  ValueTask DeleteInvoiceAsync(Guid invoiceIdentifier);

  /// <summary>
  /// Soft-deletes an invoice by identifier within a known partition.
  /// </summary>
  /// <remarks>
  /// <para>More efficient than cross-partition delete variant. Marks invoice and contained products as soft-deleted.</para>
  /// </remarks>
  /// <param name="invoiceIdentifier">Invoice identity.</param>
  /// <param name="userIdentifier">Partition (owner) identity.</param>
  ValueTask DeleteInvoiceAsync(Guid invoiceIdentifier, Guid userIdentifier);

  /// <summary>
  /// Soft-deletes all invoices for a given user partition.
  /// </summary>
  /// <remarks>
  /// <para>Iterates all partition documents; may incur significant RU charges for large partitions.</para>
  /// </remarks>
  /// <param name="userIdentifier">Partition (owner) identity whose invoices will be soft-deleted.</param>
  ValueTask DeleteInvoicesAsync(Guid userIdentifier);

  #endregion

  #region Merchant Storage Broker

  /// <summary>
  /// Persists a new merchant entity.
  /// </summary>
  /// <remarks>
  /// <para>Performs a single write operation. Caller must ensure uniqueness and upstream validation of fields.</para>
  /// </remarks>
  /// <param name="merchant">Merchant entity to persist.</param>
  /// <returns>The persisted merchant.</returns>
  /// <exception cref="ArgumentNullException">Thrown if <paramref name="merchant"/> is null.</exception>
  ValueTask<Merchant> CreateMerchantAsync(Merchant merchant);

  /// <summary>
  /// Retrieves a merchant by identifier via cross-partition (greedy) search.
  /// </summary>
  /// <remarks>
  /// <para>Use partition-aware read patterns (parent company id) where possible to reduce RU consumption.</para>
  /// </remarks>
  /// <param name="merchantIdentifier">Merchant identity.</param>
  /// <returns>The merchant or null if not found or soft-deleted (if soft-delete introduced later).</returns>
  ValueTask<Merchant?> ReadMerchantAsync(Guid merchantIdentifier);

  /// <summary>
  /// Lists all merchants (cross-partition enumeration).
  /// </summary>
  /// <remarks>
  /// <para>Potentially expensive; intended for administrative / analytical operations.</para>
  /// </remarks>
  /// <returns>An enumerable of merchants (may be empty).</returns>
  ValueTask<IEnumerable<Merchant>> ReadMerchantsAsync();

  /// <summary>
  /// Lists merchants filtered by parent company partition.
  /// </summary>
  /// <param name="parentCompanyId">Partition key representing the parent company identifier.</param>
  /// <returns>An enumerable of merchants (may be empty).</returns>
  ValueTask<IEnumerable<Merchant>> ReadMerchantsAsync(Guid parentCompanyId);

  /// <summary>
  /// Replaces (upserts) a merchant by identifier (partition inferred via existing document lookup).
  /// </summary>
  /// <param name="merchantIdentifier">Merchant identity.</param>
  /// <param name="updatedMerchant">Updated merchant snapshot.</param>
  /// <returns>The persisted merchant.</returns>
  /// <exception cref="ArgumentNullException">Thrown if <paramref name="updatedMerchant"/> is null.</exception>
  ValueTask<Merchant> UpdateMerchantAsync(Guid merchantIdentifier, Merchant updatedMerchant);

  /// <summary>
  /// Replaces (upserts) a merchant using its current and updated snapshots.
  /// </summary>
  /// <param name="currentMerchant">Current persisted merchant (not modified).</param>
  /// <param name="updatedMerchant">Updated merchant snapshot to persist.</param>
  /// <returns>The persisted merchant.</returns>
  /// <exception cref="ArgumentNullException">Thrown if <paramref name="currentMerchant"/> or <paramref name="updatedMerchant"/> is null.</exception>
  ValueTask<Merchant> UpdateMerchantAsync(Merchant currentMerchant, Merchant updatedMerchant);

  /// <summary>
  /// Soft-deletes (or physically replaces) a merchant by identifier via cross-partition search.
  /// </summary>
  /// <remarks>
  /// <para>Current implementation performs a greedy query. If soft-delete is later introduced for merchants, implementation should mark a flag rather than remove.</para>
  /// </remarks>
  /// <param name="merchantIdentifier">Merchant identity.</param>
  ValueTask DeleteMerchantAsync(Guid merchantIdentifier);

  #endregion
}
