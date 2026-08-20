namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

/// <summary>
/// Defines invoice aggregate workflows over the invoice storage Foundation.
/// </summary>
/// <remarks>
/// <para><b>Layer Role (The Standard):</b> This Orchestration depends only on
/// <see cref="IInvoiceStorageFoundationService"/> and classifies that Foundation's failures for Processing.</para>
/// <para><b>Responsibilities:</b>
/// <list type="bullet">
///   <item><description>Delegate invoice CRUD to the storage Foundation.</description></item>
///   <item><description>Attach a scan by reading and updating one invoice aggregate.</description></item>
///   <item><description>Classify Foundation validation and dependency failures.</description></item>
/// </list></para>
/// <para><b>Exclusions:</b> No Analysis Orchestration, Processing, Broker, or transport dependencies.</para>
/// </remarks>
public interface IInvoiceOrchestrationService
{
  #region Implements the Invoice Storage Foundation Service
  #region Create Invoice API
  /// <summary>
  /// Creates (persists) a new invoice aggregate via the underlying foundation storage service.
  /// </summary>
  /// <remarks>
  /// <para><b>Workflow:</b> Delegate persistence to invoice storage and return the supplied aggregate.</para>
  /// <para><b>Failure Modes:</b> Validation exceptions for invariant breaches; dependency / dependency validation exceptions surfaced from foundation layer and wrapped by implementation.</para>
  /// </remarks>
  /// <param name="invoice">Fully initialized invoice aggregate to persist.</param>
  /// <param name="userIdentifier">Tenant / partition scope; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>Persisted invoice aggregate (may contain persistence-generated fields).</returns>
  Task<Invoice> CreateInvoiceObject(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Attach Invoice Scan API
  /// <summary>
  /// Attaches one scan value to an existing invoice.
  /// </summary>
  /// <remarks>
  /// The invoice is loaded, the scan is appended, and the aggregate is persisted once.
  /// </remarks>
  /// <param name="scan">The uploaded scan to attach.</param>
  /// <param name="invoiceIdentifier">The identifier of the invoice receiving the scan.</param>
  /// <param name="userIdentifier">The optional partition context for the invoice.</param>
  /// <param name="cancellationToken">The token used to cancel validation or persistence.</param>
  /// <returns>The updated invoice aggregate containing the attached scan.</returns>
  Task<Invoice> AttachInvoiceScanAsync(
    InvoiceScan scan,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken);
  #endregion

  #region Read Invoice API
  /// <summary>
  /// Retrieves a single invoice aggregate by identifier.
  /// </summary>
  /// <remarks>
  /// <para><b>Behavior:</b> Delegates directly to invoice storage.</para>
  /// </remarks>
  /// <param name="identifier">Invoice identifier.</param>
  /// <param name="userIdentifier">Tenant / partition scope; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>Invoice instance (null or exception if not found per implementation policy).</returns>
  Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Read Invoices API
  /// <summary>
  /// Retrieves all invoices for an optional partition scope.
  /// </summary>
  /// <remarks>
  /// <para><b>Behavior:</b> Returns the sequence supplied by invoice storage.</para>
  /// </remarks>
  /// <param name="userIdentifier">Tenant / partition scope.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>Sequence of invoices (empty if none).</returns>
  Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Update Invoice API
  /// <summary>
  /// Updates (replaces) an existing invoice aggregate.
  /// </summary>
  /// <remarks>
  /// <para><b>Validation:</b> Ensures identifier consistency (argument id vs aggregate id if enforced) and domain invariants prior to persistence.</para>
  /// </remarks>
  /// <param name="updatedInvoice">Proposed new invoice state.</param>
  /// <param name="invoiceIdentifier">Identifier of invoice being updated.</param>
  /// <param name="userIdentifier">Tenant / partition scope; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>Updated invoice instance.</returns>
  Task<Invoice> UpdateInvoiceObject(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Delete Invoice API
  /// <summary>
  /// Deletes (logical or physical depending on foundation strategy) a single invoice.
  /// </summary>
  /// <remarks>
  /// <para><b>Idempotency:</b> Repeated calls yield stable terminal state.</para>
  /// <para><b>Side Effects:</b> No cascading delete is performed by this Orchestration.</para>
  /// </remarks>
  /// <param name="identifier">Invoice identifier.</param>
  /// <param name="userIdentifier">Tenant / partition scope; pass null for a cross-partition operation.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>Asynchronous task.</returns>
  Task DeleteInvoiceObject(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion
  #endregion
}
