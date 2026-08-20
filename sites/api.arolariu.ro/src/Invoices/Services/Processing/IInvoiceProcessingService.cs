namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

/// <summary>
/// Defines the unified Processing boundary for invoice, merchant, and durable analysis workflows.
/// </summary>
/// <remarks>
/// <para><b>Layer Role (The Standard):</b> This Processing service depends only on invoice, merchant, and analysis
/// Orchestration services. It never calls a Foundation or Broker directly.</para>
/// <para><b>Responsibilities:</b>
/// <list type="bullet">
///   <item><description>Coordinate invoice and merchant persistence through their dedicated Orchestrations.</description></item>
///   <item><description>Apply immutable analysis patches and durable queue retry/deletion policy.</description></item>
///   <item><description>Resolve manual code-only classification requests before aggregate persistence.</description></item>
/// </list></para>
/// <para><b>Exclusions:</b> No Foundation or Broker calls, HTTP concerns, or UI mapping.</para>
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
/// <para><b>Durable analysis:</b> Queue messages carry resolved options. Processing owns visibility renewal,
/// persistence-before-delete ordering, and terminal deletion on the fifth dequeue.</para>
/// </remarks>
public interface IInvoiceProcessingService
{
  #region Invoice Orchestration Service


  #region Create Invoice API
  /// <summary>
  /// Canonicalizes any manual ECOICOP selection and persists a new invoice through Orchestration.
  /// </summary>
  /// <remarks>
  /// <para><b>Workflow:</b> Resolve a supplied code-only classification, then delegate persistence to Invoice Orchestration.</para>
  /// </remarks>
  /// <param name="invoice">Invoice aggregate to create (MUST NOT be null).</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>A task that completes after the invoice is persisted.</returns>
  Task CreateInvoice(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Read Invoice API
  /// <summary>
  /// Retrieves a single invoice aggregate.
  /// </summary>
  /// <param name="identifier">Invoice identifier.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>The matching invoice aggregate.</returns>
  Task<Invoice> ReadInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Read Invoices API
  /// <summary>
  /// Enumerates invoices within a partition scope.
  /// </summary>
  /// <param name="userIdentifier">Partition / tenant context.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>The invoices returned for the user partition.</returns>
  Task<IEnumerable<Invoice>> ReadInvoices(Guid userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Update Invoice API
  /// <summary>
  /// Replaces an existing invoice aggregate with updated state.
  /// </summary>
  /// <param name="invoiceIdentifier">Identifier of target invoice.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="updatedInvoice">New aggregate state.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>Updated invoice.</returns>
  Task<Invoice> UpdateInvoice(
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    Invoice updatedInvoice,
    CancellationToken cancellationToken);
  #endregion

  #region Delete Invoice API
  /// <summary>
  /// Removes a single invoice from active use through Invoice Orchestration.
  /// </summary>
  /// <param name="identifier">Invoice identifier.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>A task that completes after deletion.</returns>
  Task DeleteInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Delete Invoices API
  /// <summary>
  /// Deletes all invoices for a specified partition / user.
  /// </summary>
  /// <remarks>Reads the partition and delegates one deletion per returned invoice.</remarks>
  /// <param name="userIdentifier">Partition / user identifier (MUST NOT be empty).</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>A task that completes after all returned invoices are deleted.</returns>
  Task DeleteInvoices(Guid userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Add Invoice Product API
  /// <summary>
  /// Appends a product to an invoice's product collection.
  /// </summary>
  /// <param name="invoiceIdentifier">Target invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="product">Product to add.</param>
  /// <param name="classificationCode">The optional GS1 GPC code to resolve canonically.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>A task that completes after the aggregate update.</returns>
  Task AddProduct(
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    Product product,
    string? classificationCode,
    CancellationToken cancellationToken);
  #endregion

  #region Get Invoice Products API
  /// <summary>
  /// Retrieves all products belonging to an invoice.
  /// </summary>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>The products currently stored on the invoice.</returns>
  Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Get Invoice Product API
  /// <summary>
  /// Retrieves a single product by name from an invoice.
  /// </summary>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="productName">Product name (case sensitivity policy defined by implementation).</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>The first matching product, or a default product when no item matches.</returns>
  Task<Product> GetProduct(Guid invoiceIdentifier, Guid? userIdentifier, string productName, CancellationToken cancellationToken);
  #endregion

  #region Delete Invoice Product API
  /// <summary>
  /// Deletes the first product matching the supplied name and writes the aggregate once.
  /// </summary>
  /// <remarks>
  /// Duplicate product names remain ambiguous by design; the first matching line item is removed.
  /// </remarks>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="productName">The product name used to locate the first matching line item.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>A task that completes after the aggregate update.</returns>
  Task DeleteProduct(
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    string productName,
    CancellationToken cancellationToken);
  #endregion

  #region Attach Invoice Scan API
  /// <summary>
  /// Attaches a scan value to an existing invoice.
  /// </summary>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="scan">Scans data (raw / encoded representation).</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>A task that completes after the scan is attached.</returns>
  Task AttachInvoiceScan(Guid invoiceIdentifier, Guid? userIdentifier, InvoiceScan scan, CancellationToken cancellationToken);
  #endregion

  #region Read Invoice Scans API
  /// <summary>
  /// Retrieves all scans associated with an invoice.
  /// </summary>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>The scans currently attached to the invoice.</returns>
  Task<IEnumerable<InvoiceScan>> ReadInvoiceScans(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Delete Invoice Scan API
  /// <summary>
  /// Deletes the scan resource for an invoice.
  /// </summary>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="scan">The invoice scan object</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>A task that completes after the aggregate update.</returns>
  Task DeleteInvoiceScan(Guid invoiceIdentifier, Guid? userIdentifier, InvoiceScan scan, CancellationToken cancellationToken);
  #endregion

  #region Create Invoice Metadata API
  /// <summary>
  /// Adds or merges metadata entries into an invoice's metadata dictionary.
  /// </summary>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="metadata">Key/value pairs to add or overwrite.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>A task that completes after the aggregate update.</returns>
  Task AddMetadataToInvoice(Guid invoiceIdentifier, Guid? userIdentifier, IDictionary<string, object> metadata, CancellationToken cancellationToken);
  #endregion

  #region Update Invoice Metadata API
  /// <summary>
  /// Upserts metadata entries on an invoice (adds new keys, overwrites existing ones).
  /// </summary>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="metadata">Key/value pairs to upsert.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>Updated metadata dictionary snapshot.</returns>
  Task<IDictionary<string, object>> UpdateMetadataOnInvoice(Guid invoiceIdentifier, Guid? userIdentifier, IDictionary<string, object> metadata, CancellationToken cancellationToken);
  #endregion

  #region Get Invoice Metadata API
  /// <summary>
  /// Retrieves all metadata entries attached to an invoice.
  /// </summary>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>The invoice's persisted metadata dictionary.</returns>
  Task<IDictionary<string, object>> GetMetadataFromInvoice(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Delete Invoice Metadata API
  /// <summary>
  /// Removes specific metadata keys from an invoice.
  /// </summary>
  /// <param name="invoiceIdentifier">Invoice id.</param>
  /// <param name="userIdentifier">Partition / tenant context; pass null for a cross-partition operation.</param>
  /// <param name="metadataKeys">Keys to remove.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>A task that completes after the aggregate update.</returns>
  Task DeleteMetadataFromInvoice(Guid invoiceIdentifier, Guid? userIdentifier, IEnumerable<string> metadataKeys, CancellationToken cancellationToken);
  #endregion

  #endregion

  #region Merchant Orchestration Service

  #region Create Merchant API
  /// <summary>
  /// Canonicalizes any manual NACE selection and persists a merchant through Orchestration.
  /// </summary>
  /// <param name="merchant">Merchant aggregate.</param>
  /// <param name="parentCompanyId">Partition / company scope; pass null for a cross-partition operation.</param>
  /// <param name="classificationCode">The optional NACE 2.1 code to resolve canonically.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>A task that completes after merchant persistence.</returns>
  Task CreateMerchant(Merchant merchant, Guid? parentCompanyId, string? classificationCode, CancellationToken cancellationToken);
  #endregion

  #region Read Merchant API
  /// <summary>
  /// Retrieves a merchant aggregate by identifier.
  /// </summary>
  /// <param name="identifier">Merchant id.</param>
  /// <param name="parentCompanyId">Partition / company scope; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>The matching merchant entity.</returns>
  Task<Merchant> ReadMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Read Merchants API
  /// <summary>
  /// Enumerates merchants optionally filtered by a partition / company scope.
  /// </summary>
  /// <param name="parentCompanyId">Company / partition scope.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>The merchants returned for the parent-company partition.</returns>
  Task<IEnumerable<Merchant>> ReadMerchants(Guid parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Update Merchant API
  /// <summary>
  /// Replaces an existing merchant aggregate with updated state.
  /// </summary>
  /// <param name="identifier">Merchant id.</param>
  /// <param name="parentCompanyId">Company / partition scope; pass null for a cross-partition operation.</param>
  /// <param name="updatedMerchant">New merchant state.</param>
  /// <param name="classificationCode">The optional NACE 2.1 code to resolve canonically.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>Updated merchant.</returns>
  Task<Merchant> UpdateMerchant(
    Guid identifier,
    Guid? parentCompanyId,
    Merchant updatedMerchant,
    string? classificationCode,
    CancellationToken cancellationToken);
  #endregion

  #region Delete Merchant API
  /// <summary>
  /// Deletes a merchant aggregate.
  /// </summary>
  /// <param name="identifier">Merchant id.</param>
  /// <param name="parentCompanyId">Company / partition scope; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>A task that completes after merchant deletion.</returns>
  Task DeleteMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Analysis Queue
  /// <summary>Validates invoice ownership and queues a request with resolved analysis options.</summary>
  /// <param name="invoiceId">The invoice identifier to analyze.</param>
  /// <param name="userIdentifier">The authenticated invoice owner.</param>
  /// <param name="request">The requested analysis profile and capability overrides.</param>
  /// <param name="cancellationToken">The token used to cancel validation or publication.</param>
  /// <returns>Azure Queue's provider message identifier.</returns>
  Task<string> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    InvoiceAnalysisRequestDto request,
    CancellationToken cancellationToken);

  /// <summary>Validates merchant ownership and queues a request with resolved analysis options.</summary>
  /// <param name="merchantId">The merchant identifier to analyze.</param>
  /// <param name="userIdentifier">The authenticated requester.</param>
  /// <param name="request">The requested analysis profile and capability overrides.</param>
  /// <param name="cancellationToken">The token used to cancel validation or publication.</param>
  /// <returns>Azure Queue's provider message identifier.</returns>
  Task<string> QueueMerchantAnalysisAsync(
    Guid merchantId,
    Guid userIdentifier,
    MerchantAnalysisRequestDto request,
    CancellationToken cancellationToken);

  /// <summary>Receives at most one visible analysis message.</summary>
  /// <param name="cancellationToken">The token used to cancel dequeue.</param>
  /// <returns>The receipt, or <see langword="null"/> when no message is visible.</returns>
  Task<AnalysisQueueReceipt?> ReceiveNextAnalysisAsync(CancellationToken cancellationToken);

  /// <summary>Executes a scope while renewing queue visibility.</summary>
  /// <typeparam name="TResult">The coordinated operation's result type.</typeparam>
  /// <param name="receipt">The currently owned queue receipt.</param>
  /// <param name="operation">The operation to execute with the linked renewal token.</param>
  /// <param name="cancellationToken">The token used to cancel execution and renewal.</param>
  /// <returns>The coordinated operation result.</returns>
  Task<TResult> ExecuteWithVisibilityRenewalAsync<TResult>(
    AnalysisQueueReceipt receipt,
    Func<CancellationToken, Task<TResult>> operation,
    CancellationToken cancellationToken);

  /// <summary>Executes invoice analysis without persisting the aggregate.</summary>
  /// <param name="message">The durable invoice analysis request.</param>
  /// <param name="invoice">The invoice snapshot to analyze.</param>
  /// <param name="cancellationToken">The token used to cancel capability execution.</param>
  /// <returns>The immutable invoice analysis execution result.</returns>
  Task<InvoiceAnalysisExecutionResult> ExecuteInvoiceAnalysisAsync(
    QueueAnalysisMessage message,
    Invoice invoice,
    CancellationToken cancellationToken);

  /// <summary>Executes merchant analysis without persisting the aggregate.</summary>
  /// <param name="message">The durable merchant analysis request.</param>
  /// <param name="merchant">The merchant snapshot to analyze.</param>
  /// <param name="cancellationToken">The token used to cancel capability execution.</param>
  /// <returns>The immutable merchant analysis execution result.</returns>
  Task<MerchantAnalysisExecutionResult> ExecuteMerchantAnalysisAsync(
    QueueAnalysisMessage message,
    Merchant merchant,
    CancellationToken cancellationToken);

  /// <summary>Deletes one completed or terminally failed analysis message.</summary>
  /// <param name="receipt">The queue receipt to delete.</param>
  /// <param name="failureReason">The terminal failure reason to log, or <see langword="null"/> for success.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after deletion.</returns>
  Task DeleteAnalysisAsync(
    AnalysisQueueReceipt receipt,
    AnalysisFailureReason? failureReason,
    CancellationToken cancellationToken);

  /// <summary>Receives and processes at most one visible analysis message.</summary>
  /// <param name="cancellationToken">The token used to cancel dequeue or processing.</param>
  /// <returns><see langword="true"/> when a message was received; otherwise, <see langword="false"/>.</returns>
  Task<bool> ProcessAnalysisAsync(CancellationToken cancellationToken);
  #endregion

  #endregion
}
