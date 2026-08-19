namespace arolariu.Backend.Domain.Invoices.Services.Management;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Routes endpoint and worker requests through the unified invoice Processing boundary.
/// </summary>
public sealed partial class InvoiceManagementService : IInvoiceManagementService
{
  private readonly IInvoiceProcessingService invoiceProcessingService;

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceManagementService"/> class.
  /// </summary>
  public InvoiceManagementService(IInvoiceProcessingService invoiceProcessingService)
  {
    ArgumentNullException.ThrowIfNull(invoiceProcessingService);

    this.invoiceProcessingService = invoiceProcessingService;
  }

  /// <inheritdoc/>
  public async Task CreateInvoice(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
      await invoiceProcessingService.CreateInvoice(invoice, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Invoice> ReadInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoice));
      return await invoiceProcessingService.ReadInvoice(identifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IEnumerable<Invoice>> ReadInvoices(Guid userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoices));
      return await invoiceProcessingService.ReadInvoices(userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Invoice> UpdateInvoice(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoice));
      return await invoiceProcessingService
        .UpdateInvoice(updatedInvoice, invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoice));
      await invoiceProcessingService.DeleteInvoice(identifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteInvoices(Guid userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoices));
      await invoiceProcessingService.DeleteInvoices(userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task AddProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddProduct));
      await invoiceProcessingService.AddProduct(product, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Product> UpdateProduct(
    string productName,
    Product updatedProduct,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateProduct));
      return await invoiceProcessingService
        .UpdateProduct(productName, updatedProduct, invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GetProducts));
      return await invoiceProcessingService.GetProducts(invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Product> GetProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GetProduct));
      return await invoiceProcessingService.GetProduct(productName, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteProduct(
    string productName,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteProduct));
      await invoiceProcessingService.DeleteProduct(productName, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task CreateInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceScan));
      await invoiceProcessingService.CreateInvoiceScan(scan, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IEnumerable<InvoiceScan>> ReadInvoiceScans(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceScans));
      return await invoiceProcessingService.ReadInvoiceScans(invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceScan));
      await invoiceProcessingService.DeleteInvoiceScan(scan, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task AddMetadataToInvoice(
    IDictionary<string, object> metadata,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddMetadataToInvoice));
      await invoiceProcessingService
        .AddMetadataToInvoice(metadata, invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IDictionary<string, object>> UpdateMetadataOnInvoice(
    IDictionary<string, object> metadata,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMetadataOnInvoice));
      return await invoiceProcessingService
        .UpdateMetadataOnInvoice(metadata, invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IDictionary<string, object>> GetMetadataFromInvoice(
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GetMetadataFromInvoice));
      return await invoiceProcessingService
        .GetMetadataFromInvoice(invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteMetadataFromInvoice(
    IEnumerable<string> metadataKeys,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMetadataFromInvoice));
      await invoiceProcessingService
        .DeleteMetadataFromInvoice(metadataKeys, invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task CreateMerchant(Merchant merchant, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchant));
      await invoiceProcessingService.CreateMerchant(merchant, parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Merchant> ReadMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchant));
      return await invoiceProcessingService.ReadMerchant(identifier, parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IEnumerable<Merchant>> ReadMerchants(Guid parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchants));
      return await invoiceProcessingService.ReadMerchants(parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Merchant> UpdateMerchant(Merchant updatedMerchant, Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchant));
      return await invoiceProcessingService.UpdateMerchant(updatedMerchant, identifier, parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchant));
      await invoiceProcessingService.DeleteMerchant(identifier, parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<InvoiceAnalysisExecutionResult> PersistInvoiceAnalysisAsync(
    InvoiceAnalysisExecutionResult executionResult,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PersistInvoiceAnalysisAsync));
      return await invoiceProcessingService.PersistInvoiceAnalysisAsync(executionResult, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<MerchantAnalysisExecutionResult> PersistMerchantAnalysisAsync(
    MerchantAnalysisExecutionResult executionResult,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PersistMerchantAnalysisAsync));
      return await invoiceProcessingService.PersistMerchantAnalysisAsync(executionResult, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task EnsureAnalysisQueueAsync(CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureAnalysisQueueAsync));
      await invoiceProcessingService.EnsureAnalysisQueueAsync(cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisAcceptedResponseDto> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    AnalyzeInvoiceRequestDto request,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(QueueInvoiceAnalysisAsync));
      return await invoiceProcessingService
        .QueueInvoiceAnalysisAsync(invoiceId, userIdentifier, request, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisAcceptedResponseDto> QueueMerchantAnalysisAsync(
    Guid merchantId,
    Guid userIdentifier,
    AnalyzeMerchantRequestDto request,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(QueueMerchantAnalysisAsync));
      return await invoiceProcessingService
        .QueueMerchantAnalysisAsync(merchantId, userIdentifier, request, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<bool> TryExecuteNextAnalysisAsync(CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(TryExecuteNextAnalysisAsync));
      return await invoiceProcessingService
        .TryExecuteNextAnalysisAsync(cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);
}
