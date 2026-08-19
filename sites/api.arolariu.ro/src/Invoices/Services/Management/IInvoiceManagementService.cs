namespace arolariu.Backend.Domain.Invoices.Services.Management;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.Services.Processing;

/// <summary>
/// Defines the standalone business-facing contract consumed by invoice endpoints and the analysis worker.
/// </summary>
public interface IInvoiceManagementService
{
  #region Invoice CRUD
  /// <inheritdoc cref="IInvoiceProcessingService.CreateInvoice"/>
  Task CreateInvoice(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.ReadInvoice"/>
  Task<Invoice> ReadInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.ReadInvoices"/>
  Task<IEnumerable<Invoice>> ReadInvoices(Guid userIdentifier, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.UpdateInvoice"/>
  Task<Invoice> UpdateInvoice(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.DeleteInvoice"/>
  Task DeleteInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.DeleteInvoices"/>
  Task DeleteInvoices(Guid userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Product CRUD
  /// <inheritdoc cref="IInvoiceProcessingService.AddProduct"/>
  Task AddProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.UpdateProduct"/>
  Task<Product> UpdateProduct(
    string productName,
    Product updatedProduct,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.GetProducts"/>
  Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.GetProduct"/>
  Task<Product> GetProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.DeleteProduct"/>
  Task DeleteProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Scan CRUD
  /// <inheritdoc cref="IInvoiceProcessingService.CreateInvoiceScan"/>
  Task CreateInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.ReadInvoiceScans"/>
  Task<IEnumerable<InvoiceScan>> ReadInvoiceScans(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.DeleteInvoiceScan"/>
  Task DeleteInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Metadata CRUD
  /// <inheritdoc cref="IInvoiceProcessingService.AddMetadataToInvoice"/>
  Task AddMetadataToInvoice(IDictionary<string, object> metadata, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.UpdateMetadataOnInvoice"/>
  Task<IDictionary<string, object>> UpdateMetadataOnInvoice(IDictionary<string, object> metadata, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.GetMetadataFromInvoice"/>
  Task<IDictionary<string, object>> GetMetadataFromInvoice(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.DeleteMetadataFromInvoice"/>
  Task DeleteMetadataFromInvoice(IEnumerable<string> metadataKeys, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken);
  #endregion

  #region Merchant CRUD
  /// <inheritdoc cref="IInvoiceProcessingService.CreateMerchant"/>
  Task CreateMerchant(Merchant merchant, Guid? parentCompanyId, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.ReadMerchant"/>
  Task<Merchant> ReadMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.ReadMerchants"/>
  Task<IEnumerable<Merchant>> ReadMerchants(Guid parentCompanyId, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.UpdateMerchant"/>
  Task<Merchant> UpdateMerchant(Merchant updatedMerchant, Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.DeleteMerchant"/>
  Task DeleteMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Analysis Queue
  /// <inheritdoc cref="IInvoiceProcessingService.PersistInvoiceAnalysisAsync"/>
  Task<InvoiceAnalysisExecutionResult> PersistInvoiceAnalysisAsync(
    InvoiceAnalysisExecutionResult executionResult,
    CancellationToken cancellationToken);

  /// <inheritdoc cref="IInvoiceProcessingService.PersistMerchantAnalysisAsync"/>
  Task<MerchantAnalysisExecutionResult> PersistMerchantAnalysisAsync(
    MerchantAnalysisExecutionResult executionResult,
    CancellationToken cancellationToken);

  /// <summary>Ensures the backend-owned analysis queue exists.</summary>
  Task EnsureAnalysisQueueAsync(CancellationToken cancellationToken);

  /// <summary>Queues invoice analysis after validating target ownership.</summary>
  Task<AnalysisAcceptedResponseDto> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    InvoiceAnalysisRequestDto request,
    CancellationToken cancellationToken);

  /// <summary>Queues merchant analysis after validating target ownership.</summary>
  Task<AnalysisAcceptedResponseDto> QueueMerchantAnalysisAsync(
    Guid merchantId,
    Guid userIdentifier,
    MerchantAnalysisRequestDto request,
    CancellationToken cancellationToken);

  /// <summary>Receives and processes at most one visible analysis message.</summary>
  Task<bool> TryExecuteNextAnalysisAsync(CancellationToken cancellationToken);
  #endregion
}
