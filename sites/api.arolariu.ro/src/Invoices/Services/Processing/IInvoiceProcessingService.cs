namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// Processing layer contract for performing higher-cost or multi-step domain operations (enrichment, aggregation, fan‑out mutations) over invoice and merchant aggregates.
/// </summary>
/// <remarks>
/// <para><b>Layer Role (The Standard):</b> Processing services encapsulate computational / transformational logic that may compose foundation services and
/// optionally orchestration services for delegated persistence / retrieval, while remaining transport-agnostic.</para>
/// <para><b>Responsibilities:</b>
/// <list type="bullet">
///   <item><description>Perform analysis / enrichment flows that are more than a simple single-service call (e.g., iterative product normalization).</description></item>
///   <item><description>Apply batch style or multi-entity operations (e.g., deleting all invoices for a user).</description></item>
///   <item><description>Isolate performance-sensitive logic (looping, projection building, in‑memory filtering) away from orchestration layer.</description></item>
/// </list></para>
/// <para><b>Exclusions:</b> No direct broker calls (should be via foundation), no HTTP concerns, no UI mapping, no long‑running state persistence.</para>
/// <para><b>Partitioning:</b> <c>userIdentifier</c> / <c>parentCompanyId</c> are partition discriminators and MUST be
/// propagated downstream unchanged. They are <b>nullable but not optional</b> — every caller states its intent explicitly:
/// <list type="bullet">
///   <item><description>Non-null — the caller knows the owning partition. Resolves to a point read or a partition-scoped
///   collection read. This is the cheap path and should be preferred wherever the partition is known.</description></item>
///   <item><description><see langword="null"/> — the caller deliberately wants a cross-partition ("greedy") query, e.g. to serve a
///   view spanning all users. This costs materially more RU and should be a conscious choice.</description></item>
/// </list>
/// The fork between those two strategies lives <b>only in the broker layer</b>; every layer above simply forwards the value.
/// That is what lets one endpoint and one business-logic path serve both the scoped and the global case.</para>
/// <para><b>Idempotency:</b> Read operations and deletions of already non‑existent resources are idempotent; create / update operations are not inherently idempotent.</para>
/// <para><b>Concurrency:</b> No optimistic concurrency yet; future enhancement may integrate version / ETag semantics.</para>
/// </remarks>
public interface IInvoiceProcessingService
{
  #region Invoice Orchestration Service


  #region Create Invoice API
  /// <summary>
  /// Persists a new invoice aggregate (delegates persistence to foundation layer).
  /// </summary>
  /// <remarks>
  /// <para><b>Workflow:</b> Validate aggregate invariants → call foundation storage → perform optional post-create enrichment (future).</para>
  /// </remarks>
  /// <param name="invoice">Invoice aggregate to create (MUST NOT be null).</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task CreateInvoice(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Read Invoice API
  /// <summary>
  /// Retrieves a single invoice aggregate.
  /// </summary>
  /// <param name="identifier">Invoice identifier.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>The invoice or null / exception depending on implementation policy.</returns>
  Task<Invoice> ReadInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Read Invoices API
  /// <summary>
  /// Enumerates invoices within a partition scope.
  /// </summary>
  /// <remarks><b>Pagination:</b> Not implemented (backlog).</remarks>
  /// <param name="userIdentifier">Partition / tenant context.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task<IEnumerable<Invoice>> ReadInvoices(Guid userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Update Invoice API
  /// <summary>
  /// Replaces an existing invoice aggregate with updated state.
  /// </summary>
  /// <param name="updatedInvoice">New aggregate state.</param>
  /// <param name="invoiceIdentifier">Identifier of target invoice.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>Updated invoice.</returns>
  Task<Invoice> UpdateInvoice(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Delete Invoice API
  /// <summary>
  /// Deletes a single invoice (logical or physical per foundation implementation).
  /// </summary>
  /// <param name="identifier">Invoice identifier.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task DeleteInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Delete Invoices API
  /// <summary>
  /// Deletes all invoices for a specified partition / user.
  /// </summary>
  /// <remarks><b>Caution:</b> Potentially expensive operation (fan‑out deletes). Backlog: replace with batch / soft-delete flag.</remarks>
  /// <param name="userIdentifier">Partition / user identifier (MUST NOT be empty).</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task DeleteInvoices(Guid userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Add Invoice Product API
  /// <summary>
  /// Adds (appends or merges) a product into an invoice's product collection.
  /// </summary>
  /// <param name="product">Product to add.</param>
  /// <param name="invoiceIdentifier">Target invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task AddProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Get Invoice Products API
  /// <summary>
  /// Retrieves all products belonging to an invoice.
  /// </summary>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Get Invoice Product API
  /// <summary>
  /// Retrieves a single product by name from an invoice.
  /// </summary>
  /// <param name="productName">Product name (case sensitivity policy defined by implementation).</param>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task<Product> GetProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Delete Invoice Product API
  /// <summary>
  /// Deletes a product from an invoice by name.
  /// </summary>
  /// <param name="productName">Product name.</param>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task DeleteProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <summary>
  /// Deletes a product from an invoice using the product value object.
  /// </summary>
  /// <param name="product">Product instance to remove (matched by identifying fields).</param>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task DeleteProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Create Invoice Scan API
  /// <summary>
  /// Creates (persists) a scan resource associated with an invoice.
  /// </summary>
  /// <param name="scan">Scans data (raw / encoded representation).</param>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task CreateInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Read Invoice Scans API
  /// <summary>
  /// Retrieves all scans associated with an invoice.
  /// </summary>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns></returns>
  Task<IEnumerable<InvoiceScan>> ReadInvoiceScans(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Delete Invoice Scan API
  /// <summary>
  /// Deletes the scan resource for an invoice.
  /// </summary>
  /// <param name="scan">The invoice scan object</param>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task DeleteInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Create Invoice Metadata API
  /// <summary>
  /// Adds or merges metadata entries into an invoice's metadata dictionary.
  /// </summary>
  /// <param name="metadata">Key/value pairs to add or overwrite.</param>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task AddMetadataToInvoice(IDictionary<string, object> metadata, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Update Invoice Metadata API
  /// <summary>
  /// Upserts metadata entries on an invoice (adds new keys, overwrites existing ones).
  /// </summary>
  /// <param name="metadata">Key/value pairs to upsert.</param>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>Updated metadata dictionary snapshot.</returns>
  Task<IDictionary<string, object>> UpdateMetadataOnInvoice(IDictionary<string, object> metadata, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Get Invoice Metadata API
  /// <summary>
  /// Retrieves all metadata entries attached to an invoice.
  /// </summary>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task<IDictionary<string, object>> GetMetadataFromInvoice(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Delete Invoice Metadata API
  /// <summary>
  /// Removes specific metadata keys from an invoice.
  /// </summary>
  /// <param name="metadataKeys">Keys to remove.</param>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task DeleteMetadataFromInvoice(IEnumerable<string> metadataKeys, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #endregion

  #region Merchant Orchestration Service

  #region Create Merchant API
  /// <summary>
  /// Persists a new merchant aggregate (delegates to foundation storage).
  /// </summary>
  /// <param name="merchant">Merchant aggregate.</param>
  /// <param name="parentCompanyId">Partition / company scope; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task CreateMerchant(Merchant merchant, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Read Merchant API
  /// <summary>
  /// Retrieves a merchant aggregate by identifier.
  /// </summary>
  /// <param name="identifier">Merchant id.</param>
  /// <param name="parentCompanyId">Partition / company scope; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task<Merchant> ReadMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Read Merchants API
  /// <summary>
  /// Enumerates merchants optionally filtered by a partition / company scope.
  /// </summary>
  /// <param name="parentCompanyId">Company / partition scope.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task<IEnumerable<Merchant>> ReadMerchants(Guid parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Update Merchant API
  /// <summary>
  /// Replaces an existing merchant aggregate with updated state.
  /// </summary>
  /// <param name="updatedMerchant">New merchant state.</param>
  /// <param name="identifier">Merchant id.</param>
  /// <param name="parentCompanyId">Company / partition scope; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>Updated merchant.</returns>
  Task<Merchant> UpdateMerchant(Merchant updatedMerchant, Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Delete Merchant API
  /// <summary>
  /// Deletes a merchant aggregate.
  /// </summary>
  /// <param name="identifier">Merchant id.</param>
  /// <param name="parentCompanyId">Company / partition scope; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  Task DeleteMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #endregion
}
