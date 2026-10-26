namespace arolariu.Backend.Domain.Tests.Invoices.Workers;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.Services.Management;

/// <summary>
/// Provides a minimal <see cref="IInvoiceManagementService"/> test double for worker tests.
/// </summary>
internal abstract class WorkerManagementServiceBase : IInvoiceManagementService
{
  protected static Exception Unsupported() => new NotSupportedException();

  public virtual Task<string> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    InvoiceAnalysisRequestDto request,
    CancellationToken cancellationToken) => Task.FromException<string>(Unsupported());

  public virtual Task<string> QueueMerchantAnalysisAsync(
    Guid merchantId,
    Guid userIdentifier,
    MerchantAnalysisRequestDto request,
    CancellationToken cancellationToken) => Task.FromException<string>(Unsupported());

  public virtual Task<bool> ProcessAnalysisAsync(CancellationToken cancellationToken) => Task.FromResult(false);

  public Task CreateInvoice(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task<Invoice> ReadInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException<Invoice>(Unsupported());
  public Task<IEnumerable<Invoice>> ReadInvoices(Guid userIdentifier, CancellationToken cancellationToken) => Task.FromException<IEnumerable<Invoice>>(Unsupported());
  public Task<Invoice> UpdateInvoice(Guid invoiceIdentifier, Guid? userIdentifier, Invoice updatedInvoice, CancellationToken cancellationToken) => Task.FromException<Invoice>(Unsupported());
  public Task DeleteInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task DeleteInvoices(Guid userIdentifier, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task AddProduct(Guid invoiceIdentifier, Guid? userIdentifier, Product product, string? classificationCode, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException<IEnumerable<Product>>(Unsupported());
  public Task<Product> GetProduct(Guid invoiceIdentifier, Guid? userIdentifier, string productName, CancellationToken cancellationToken) => Task.FromException<Product>(Unsupported());
  public Task DeleteProduct(Guid invoiceIdentifier, Guid? userIdentifier, string productName, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task AttachInvoiceScan(Guid invoiceIdentifier, Guid? userIdentifier, InvoiceScan scan, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task<IEnumerable<InvoiceScan>> ReadInvoiceScans(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException<IEnumerable<InvoiceScan>>(Unsupported());
  public Task DeleteInvoiceScan(Guid invoiceIdentifier, Guid? userIdentifier, InvoiceScan scan, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task AddMetadataToInvoice(Guid invoiceIdentifier, Guid? userIdentifier, IDictionary<string, object> metadata, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task<IDictionary<string, object>> UpdateMetadataOnInvoice(Guid invoiceIdentifier, Guid? userIdentifier, IDictionary<string, object> metadata, CancellationToken cancellationToken) => Task.FromException<IDictionary<string, object>>(Unsupported());
  public Task<IDictionary<string, object>> GetMetadataFromInvoice(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) => Task.FromException<IDictionary<string, object>>(Unsupported());
  public Task DeleteMetadataFromInvoice(Guid invoiceIdentifier, Guid? userIdentifier, IEnumerable<string> metadataKeys, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task CreateMerchant(Merchant merchant, Guid? parentCompanyId, string? classificationCode, CancellationToken cancellationToken) => Task.FromException(Unsupported());
  public Task<Merchant> ReadMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) => Task.FromException<Merchant>(Unsupported());
  public Task<IEnumerable<Merchant>> ReadMerchants(Guid parentCompanyId, CancellationToken cancellationToken) => Task.FromException<IEnumerable<Merchant>>(Unsupported());
  public Task<(IReadOnlyCollection<Merchant> Merchants, IReadOnlyCollection<Invoice> Invoices)> ReadMerchantsVisibleToUser(
    Guid userIdentifier,
    CancellationToken cancellationToken) =>
    Task.FromException<(IReadOnlyCollection<Merchant>, IReadOnlyCollection<Invoice>)>(Unsupported());
  public Task<Merchant> UpdateMerchant(Guid identifier, Guid? parentCompanyId, Merchant updatedMerchant, string? classificationCode, CancellationToken cancellationToken) => Task.FromException<Merchant>(Unsupported());
  public Task DeleteMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) => Task.FromException(Unsupported());
}
