namespace arolariu.Backend.Domain.Tests.Invoices.Workers;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Management;

/// <summary>
/// Provides a minimal <see cref="IInvoiceManagementService"/> test double for worker tests.
/// </summary>
internal abstract class WorkerManagementServiceBase : IInvoiceManagementService
{
  protected static Exception Unsupported() => new NotSupportedException();

  public virtual Task EnsureAnalysisQueueAsync(CancellationToken cancellationToken) => Task.CompletedTask;

  public virtual Task<AnalysisAcceptedResponseDto> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    AnalyzeInvoiceRequestDto request,
    CancellationToken cancellationToken) => Task.FromException<AnalysisAcceptedResponseDto>(Unsupported());

  public virtual Task<AnalysisAcceptedResponseDto> QueueMerchantAnalysisAsync(
    Guid merchantId,
    Guid userIdentifier,
    AnalyzeMerchantRequestDto request,
    CancellationToken cancellationToken) => Task.FromException<AnalysisAcceptedResponseDto>(Unsupported());

  public virtual Task<bool> TryExecuteNextAnalysisAsync(CancellationToken cancellationToken) => Task.FromResult(false);

  public Task CreateInvoice(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task<Invoice> ReadInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException<Invoice>(Unsupported());
  public Task<IEnumerable<Invoice>> ReadInvoices(Guid userIdentifier, CancellationToken cancellationToken) => Task.FromException<IEnumerable<Invoice>>(Unsupported());
  public Task<Invoice> UpdateInvoice(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException<Invoice>(Unsupported());
  public Task DeleteInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task DeleteInvoices(Guid userIdentifier, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task AddProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task<Product> UpdateProduct(ProductUpdateSelector selector, Product updatedProduct, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException<Product>(Unsupported());
  public Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException<IEnumerable<Product>>(Unsupported());
  public Task<Product> GetProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException<Product>(Unsupported());
  public Task DeleteProduct(ProductUpdateSelector selector, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task CreateInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task<IEnumerable<InvoiceScan>> ReadInvoiceScans(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException<IEnumerable<InvoiceScan>>(Unsupported());
  public Task DeleteInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task AddMetadataToInvoice(IDictionary<string, object> metadata, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task<IDictionary<string, object>> UpdateMetadataOnInvoice(IDictionary<string, object> metadata, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException<IDictionary<string, object>>(Unsupported());
  public Task<IDictionary<string, object>> GetMetadataFromInvoice(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException<IDictionary<string, object>>(Unsupported());
  public Task DeleteMetadataFromInvoice(IEnumerable<string> metadataKeys, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task CreateMerchant(Merchant merchant, Guid? parentCompanyId, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task<Merchant> ReadMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) => Task.FromException<Merchant>(Unsupported());
  public Task<IEnumerable<Merchant>> ReadMerchants(Guid parentCompanyId, CancellationToken cancellationToken) => Task.FromException<IEnumerable<Merchant>>(Unsupported());
  public Task<Merchant> UpdateMerchant(Merchant updatedMerchant, Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) => Task.FromException<Merchant>(Unsupported());
  public Task DeleteMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task<InvoiceAnalysisExecutionResult> PersistInvoiceAnalysisAsync(InvoiceAnalysisExecutionResult executionResult, CancellationToken cancellationToken) => Task.FromException<InvoiceAnalysisExecutionResult>(Unsupported());
  public Task<MerchantAnalysisExecutionResult> PersistMerchantAnalysisAsync(MerchantAnalysisExecutionResult executionResult, CancellationToken cancellationToken) => Task.FromException<MerchantAnalysisExecutionResult>(Unsupported());
}
