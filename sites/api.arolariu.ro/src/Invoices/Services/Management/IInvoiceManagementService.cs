namespace arolariu.Backend.Domain.Invoices.Services.Management;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

/// <summary>
/// Defines the standalone business-facing contract consumed by invoice endpoints and the analysis worker.
/// </summary>
/// <remarks>
/// This Management boundary delegates every operation to the unified Processing service, preserves cancellation,
/// and classifies lower-layer failures into the invoice Management exception family.
/// </remarks>
public interface IInvoiceManagementService
{
  #region Invoice CRUD
  /// <summary>Creates an invoice in its owning user partition.</summary>
  /// <param name="invoice">The invoice aggregate to persist.</param>
  /// <param name="userIdentifier">The owning user identifier, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>A task that represents the create operation.</returns>
  Task CreateInvoice(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <summary>Retrieves one invoice by identifier and optional user partition.</summary>
  /// <param name="identifier">The invoice identifier.</param>
  /// <param name="userIdentifier">The owning user partition, or <see langword="null"/> for an authorized lookup.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>The matching invoice aggregate.</returns>
  Task<Invoice> ReadInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <summary>Retrieves all invoices in one user partition.</summary>
  /// <param name="userIdentifier">The owning user partition.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>The invoices visible in the requested partition.</returns>
  Task<IEnumerable<Invoice>> ReadInvoices(Guid userIdentifier, CancellationToken cancellationToken);

  /// <summary>Replaces client-editable state on an existing invoice.</summary>
  /// <param name="invoiceIdentifier">The identifier of the persisted invoice.</param>
  /// <param name="userIdentifier">The owning user partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="updatedInvoice">The transient aggregate carrying replacement values.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>The updated invoice aggregate.</returns>
  Task<Invoice> UpdateInvoice(
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    Invoice updatedInvoice,
    CancellationToken cancellationToken);

  /// <summary>Removes one invoice from active use.</summary>
  /// <param name="identifier">The invoice identifier.</param>
  /// <param name="userIdentifier">The owning user partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>A task that represents the remove operation.</returns>
  Task DeleteInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <summary>Removes all invoices in one user partition from active use.</summary>
  /// <param name="userIdentifier">The owning user partition.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>A task that represents the bulk remove operation.</returns>
  Task DeleteInvoices(Guid userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Product CRUD
  /// <summary>Adds a product line to an existing invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The owning user partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="product">The product value to add.</param>
  /// <param name="classificationCode">The optional GS1 GPC code to resolve canonically.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>A task that represents the add operation.</returns>
  Task AddProduct(
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    Product product,
    string? classificationCode,
    CancellationToken cancellationToken);

  /// <summary>Retrieves every product line from an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The owning user partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>The invoice product lines.</returns>
  Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <summary>Retrieves the first invoice product matching a name.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The owning user partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="productName">The product name to locate.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>The matching product line.</returns>
  Task<Product> GetProduct(Guid invoiceIdentifier, Guid? userIdentifier, string productName, CancellationToken cancellationToken);

  /// <summary>Removes the first invoice product matching a name.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The owning user partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="productName">The persisted product name to remove.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>A task that represents the remove operation.</returns>
  Task DeleteProduct(Guid invoiceIdentifier, Guid? userIdentifier, string productName, CancellationToken cancellationToken);
  #endregion

  #region Scan CRUD
  /// <summary>Adds a receipt scan to an existing invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The owning user partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="scan">The scan to add.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>A task that represents the add operation.</returns>
  Task AttachInvoiceScan(Guid invoiceIdentifier, Guid? userIdentifier, InvoiceScan scan, CancellationToken cancellationToken);

  /// <summary>Retrieves every receipt scan attached to an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The owning user partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>The attached invoice scans.</returns>
  Task<IEnumerable<InvoiceScan>> ReadInvoiceScans(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <summary>Removes a receipt scan from an existing invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The owning user partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="scan">The scan value to remove.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>A task that represents the remove operation.</returns>
  Task DeleteInvoiceScan(Guid invoiceIdentifier, Guid? userIdentifier, InvoiceScan scan, CancellationToken cancellationToken);
  #endregion

  #region Metadata CRUD
  /// <summary>Adds client-owned metadata entries to an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The owning user partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="metadata">The validated metadata entries to add.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>A task that represents the metadata add operation.</returns>
  Task AddMetadataToInvoice(Guid invoiceIdentifier, Guid? userIdentifier, IDictionary<string, object> metadata, CancellationToken cancellationToken);

  /// <summary>Updates client-owned metadata entries on an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The owning user partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="metadata">The validated metadata entries to merge.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>The complete persisted metadata collection after the merge.</returns>
  Task<IDictionary<string, object>> UpdateMetadataOnInvoice(Guid invoiceIdentifier, Guid? userIdentifier, IDictionary<string, object> metadata, CancellationToken cancellationToken);

  /// <summary>Retrieves the metadata collection from an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The owning user partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>The persisted invoice metadata collection.</returns>
  Task<IDictionary<string, object>> GetMetadataFromInvoice(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <summary>Removes selected client-owned metadata entries from an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The owning user partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="metadataKeys">The metadata keys to remove.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>A task that represents the metadata remove operation.</returns>
  Task DeleteMetadataFromInvoice(Guid invoiceIdentifier, Guid? userIdentifier, IEnumerable<string> metadataKeys, CancellationToken cancellationToken);
  #endregion

  #region Merchant CRUD
  /// <summary>Creates a merchant in its parent-company partition.</summary>
  /// <param name="merchant">The merchant entity to persist.</param>
  /// <param name="parentCompanyId">The parent-company partition, or <see langword="null"/> when derived from the entity.</param>
  /// <param name="classificationCode">The optional NACE 2.1 code to resolve canonically.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>A task that represents the create operation.</returns>
  Task CreateMerchant(Merchant merchant, Guid? parentCompanyId, string? classificationCode, CancellationToken cancellationToken);

  /// <summary>Retrieves one merchant by identifier and optional parent-company partition.</summary>
  /// <param name="identifier">The merchant identifier.</param>
  /// <param name="parentCompanyId">The parent-company partition, or <see langword="null"/> for a scoped lookup.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>The matching merchant entity.</returns>
  Task<Merchant> ReadMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken);

  /// <summary>Retrieves all merchants in one parent-company partition.</summary>
  /// <param name="parentCompanyId">The parent-company partition.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>The merchants in the requested partition.</returns>
  Task<IEnumerable<Merchant>> ReadMerchants(Guid parentCompanyId, CancellationToken cancellationToken);

  /// <summary>Retrieves the merchants referenced by the caller's own invoices.</summary>
  /// <remarks>
  /// Visibility is determined by invoice merchant reference rather than by <c>CreatedBy</c>, because
  /// analysis performed by any user may create the merchant record that another user's invoice references.
  /// </remarks>
  /// <param name="userIdentifier">The authenticated user whose invoices are inspected.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>The distinct visible merchants and the caller-owned invoice snapshot used to derive them.</returns>
  Task<(IReadOnlyCollection<Merchant> Merchants, IReadOnlyCollection<Invoice> Invoices)> ReadMerchantsVisibleToUser(
    Guid userIdentifier,
    CancellationToken cancellationToken);

  /// <summary>Replaces client-editable state on an existing merchant.</summary>
  /// <param name="identifier">The persisted merchant identifier.</param>
  /// <param name="parentCompanyId">The parent-company partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="updatedMerchant">The transient merchant carrying replacement values.</param>
  /// <param name="classificationCode">The optional NACE 2.1 code to resolve canonically.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>The updated merchant entity.</returns>
  Task<Merchant> UpdateMerchant(
    Guid identifier,
    Guid? parentCompanyId,
    Merchant updatedMerchant,
    string? classificationCode,
    CancellationToken cancellationToken);

  /// <summary>Removes one merchant from active use.</summary>
  /// <param name="identifier">The merchant identifier.</param>
  /// <param name="parentCompanyId">The parent-company partition, or <see langword="null"/> when resolved downstream.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>A task that represents the remove operation.</returns>
  Task DeleteMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Analysis Queue
  /// <summary>Queues invoice analysis after validating target ownership.</summary>
  /// <param name="invoiceId">The invoice identifier to analyze.</param>
  /// <param name="userIdentifier">The authenticated owner requesting analysis.</param>
  /// <param name="request">The requested profile and capability overrides.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>Azure Queue's provider message identifier.</returns>
  Task<string> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    InvoiceAnalysisRequestDto request,
    CancellationToken cancellationToken);

  /// <summary>Queues merchant analysis after validating target ownership.</summary>
  /// <param name="merchantId">The merchant identifier to analyze.</param>
  /// <param name="userIdentifier">The authenticated user requesting analysis.</param>
  /// <param name="request">The requested profile and capability overrides.</param>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns>Azure Queue's provider message identifier.</returns>
  Task<string> QueueMerchantAnalysisAsync(
    Guid merchantId,
    Guid userIdentifier,
    MerchantAnalysisRequestDto request,
    CancellationToken cancellationToken);

  /// <summary>Receives and processes at most one visible analysis message.</summary>
  /// <param name="cancellationToken">The token that cancels the asynchronous operation.</param>
  /// <returns><see langword="true"/> when a message was processed; otherwise, <see langword="false"/>.</returns>
  Task<bool> ProcessAnalysisAsync(CancellationToken cancellationToken);
  #endregion
}
