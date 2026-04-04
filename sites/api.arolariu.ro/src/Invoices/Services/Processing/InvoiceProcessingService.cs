namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// This class represents the invoice processing service.
/// </summary>
public partial class InvoiceProcessingService : IInvoiceProcessingService
{
  private readonly IInvoiceOrchestrationService invoiceOrchestrationService;
  private readonly IMerchantOrchestrationService merchantOrchestrationService;
  private readonly ILogger<IInvoiceProcessingService> logger;

  /// <summary>
  /// Public constructor.
  /// </summary>
  /// <param name="invoiceOrchestrationService"></param>
  /// <param name="merchantOrchestrationService"></param>
  /// <param name="loggerFactory"></param>
  public InvoiceProcessingService(
    IInvoiceOrchestrationService invoiceOrchestrationService,
    IMerchantOrchestrationService merchantOrchestrationService,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(invoiceOrchestrationService);
    ArgumentNullException.ThrowIfNull(merchantOrchestrationService);

    this.invoiceOrchestrationService = invoiceOrchestrationService;
    this.merchantOrchestrationService = merchantOrchestrationService;
    logger = loggerFactory.CreateLogger<IInvoiceProcessingService>();
  }

  #region Analyze Invoice API
  /// <inheritdoc/>
  public async Task AnalyzeInvoice(AnalysisOptions options, Guid identifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoice));
    var sw = Stopwatch.StartNew();
    
    await invoiceOrchestrationService
      .AnalyzeInvoiceWithOptions(options, identifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    
    sw.Stop();
    InvoiceMetrics.RecordOperation("analyze", "invoice", "success", sw.Elapsed.TotalMilliseconds);
    InvoiceMetrics.RecordAnalysis("success", sw.Elapsed.TotalMilliseconds);
  }).ConfigureAwait(false);
  #endregion

  #region Create Invoice API
  /// <inheritdoc/>
  public async Task CreateInvoice(Invoice invoice, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
    var sw = Stopwatch.StartNew();
    
    await invoiceOrchestrationService
      .CreateInvoiceObject(invoice, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    
    sw.Stop();
    InvoiceMetrics.RecordOperation("create", "invoice", "success", sw.Elapsed.TotalMilliseconds);
  }).ConfigureAwait(false);
  #endregion

  #region Create Merchant API
  /// <inheritdoc/>
  public async Task CreateMerchant(Merchant merchant, Guid? parentCompanyId = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchant));
    var sw = Stopwatch.StartNew();
    
    await merchantOrchestrationService
      .CreateMerchantObject(merchant, parentCompanyId, cancellationToken)
      .ConfigureAwait(false);
    
    sw.Stop();
    InvoiceMetrics.RecordOperation("create", "merchant", "success", sw.Elapsed.TotalMilliseconds);
  }).ConfigureAwait(false);
  #endregion

  #region Delete Invoice API
  /// <inheritdoc/>
  public async Task DeleteInvoice(Guid identifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoice));
    var sw = Stopwatch.StartNew();
    
    await invoiceOrchestrationService
      .DeleteInvoiceObject(identifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    
    sw.Stop();
    InvoiceMetrics.RecordOperation("delete", "invoice", "success", sw.Elapsed.TotalMilliseconds);
  }).ConfigureAwait(false);
  #endregion

  #region Read Invoices API
  /// <inheritdoc/>
  public async Task<IEnumerable<Invoice>> ReadInvoices(Guid userIdentifier, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoices));
    var sw = Stopwatch.StartNew();
    
    var invoices = await invoiceOrchestrationService
      .ReadAllInvoiceObjects(userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    
    sw.Stop();
    InvoiceMetrics.RecordOperation("read", "invoice", "success", sw.Elapsed.TotalMilliseconds);
    return invoices;
  }).ConfigureAwait(false);
  #endregion

  #region Read Merchants API
  /// <inheritdoc/>
  public async Task<IEnumerable<Merchant>> ReadMerchants(Guid parentCompanyId, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchants));
    var sw = Stopwatch.StartNew();
    
    var merchants = await merchantOrchestrationService
      .ReadAllMerchantObjects(parentCompanyId, cancellationToken)
      .ConfigureAwait(false);
    
    sw.Stop();
    InvoiceMetrics.RecordOperation("read", "merchant", "success", sw.Elapsed.TotalMilliseconds);
    return merchants;
  }).ConfigureAwait(false);
  #endregion

  #region Read Invoice API
  /// <inheritdoc/>
  public async Task<Invoice> ReadInvoice(Guid identifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoice));
    var sw = Stopwatch.StartNew();
    
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(identifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    
    sw.Stop();
    InvoiceMetrics.RecordOperation("read", "invoice", "success", sw.Elapsed.TotalMilliseconds);
    return invoice;
  }).ConfigureAwait(false);
  #endregion

  #region Read Merchant API
  /// <inheritdoc/>
  public async Task<Merchant> ReadMerchant(Guid identifier, Guid? parentCompanyId = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchant));
    var sw = Stopwatch.StartNew();
    
    var merchant = await merchantOrchestrationService
      .ReadMerchantObject(identifier, parentCompanyId, cancellationToken)
      .ConfigureAwait(false);
    
    sw.Stop();
    InvoiceMetrics.RecordOperation("read", "merchant", "success", sw.Elapsed.TotalMilliseconds);
    return merchant;
  }).ConfigureAwait(false);
  #endregion

  #region Update Invoice API
  /// <inheritdoc/>
  public async Task<Invoice> UpdateInvoice(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoice));
    var sw = Stopwatch.StartNew();
    
    var newInvoice = await invoiceOrchestrationService
      .UpdateInvoiceObject(updatedInvoice, invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    
    sw.Stop();
    InvoiceMetrics.RecordOperation("update", "invoice", "success", sw.Elapsed.TotalMilliseconds);
    return newInvoice;
  }).ConfigureAwait(false);
  #endregion

  #region Update Merchant API
  /// <inheritdoc/>
  public async Task<Merchant> UpdateMerchant(Merchant updatedMerchant, Guid identifier, Guid? parentCompanyId = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchant));
    var sw = Stopwatch.StartNew();
    
    var newMerchant = await merchantOrchestrationService
      .UpdateMerchantObject(updatedMerchant, identifier, parentCompanyId, cancellationToken)
      .ConfigureAwait(false);
    
    sw.Stop();
    InvoiceMetrics.RecordOperation("update", "merchant", "success", sw.Elapsed.TotalMilliseconds);
    return newMerchant;
  }).ConfigureAwait(false);
  #endregion

  #region Delete Merchant API
  /// <inheritdoc/>
  public async Task DeleteMerchant(Guid identifier, Guid? parentCompanyId = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchant));
    var sw = Stopwatch.StartNew();
    
    await merchantOrchestrationService
      .DeleteMerchantObject(identifier, parentCompanyId, cancellationToken)
      .ConfigureAwait(false);
    
    sw.Stop();
    InvoiceMetrics.RecordOperation("delete", "merchant", "success", sw.Elapsed.TotalMilliseconds);
  }).ConfigureAwait(false);
  #endregion

  #region Add Product API
  /// <inheritdoc/>
  public async Task AddProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(AddProduct));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    invoice.Items.Add(product);

    await invoiceOrchestrationService
      .UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Get Products API
  /// <inheritdoc/>
  public async Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(GetProducts));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    var products = invoice.Items;
    return products;
  }).ConfigureAwait(false);
  #endregion

  #region Get Product API
  /// <inheritdoc/>
  public async Task<Product> GetProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(GetProduct));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    var products = invoice.Items;
    var product = products.FirstOrDefault(
      p => p.RawName.Contains(productName, StringComparison.InvariantCultureIgnoreCase) ||
        p.GenericName.Contains(productName, StringComparison.InvariantCultureIgnoreCase),
      new Product());

    return product;
  }).ConfigureAwait(false);
  #endregion

  #region Delete Product API
  /// <inheritdoc/>
  public async Task DeleteProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteProduct));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    var product = invoice.Items.FirstOrDefault(
      p => p.RawName.Contains(productName, StringComparison.InvariantCultureIgnoreCase) ||
        p.GenericName.Contains(productName, StringComparison.InvariantCultureIgnoreCase),
      new Product());

    var newInvoice = invoice;
    newInvoice.Items.Remove(product);

    var currentInvoice = await invoiceOrchestrationService
      .UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    return currentInvoice;
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteProduct));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    var foundProduct = invoice.Items.FirstOrDefault(
      p => p.RawName.Contains(product.RawName, StringComparison.InvariantCultureIgnoreCase) ||
        p.GenericName.Contains(product.GenericName, StringComparison.InvariantCultureIgnoreCase),
      new Product());

    var newInvoice = invoice;
    newInvoice.Items.Remove(product);

    var currentInvoice = await invoiceOrchestrationService
      .UpdateInvoiceObject(newInvoice, invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    return currentInvoice;
  }).ConfigureAwait(false);
  #endregion

  #region Delete Invoices API
  /// <inheritdoc/>
  public async Task DeleteInvoices(Guid userIdentifier, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoices));
    var possibleInvoices = await invoiceOrchestrationService
      .ReadAllInvoiceObjects(userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    foreach (var invoice in possibleInvoices)
    {
      cancellationToken.ThrowIfCancellationRequested();
      await invoiceOrchestrationService
        .DeleteInvoiceObject(invoice.id, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }
  }).ConfigureAwait(false);
  #endregion

  #region Create Invoice Scan API
  /// <inheritdoc/>
  public async Task CreateInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceScan));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    invoice.Scans.Add(scan);

    await invoiceOrchestrationService
      .UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Read Invoice Scans API
  /// <inheritdoc/>
  public async Task<IEnumerable<InvoiceScan>> ReadInvoiceScans(Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceScans));
    var invoice = await invoiceOrchestrationService
        .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    return invoice.Scans;
  }).ConfigureAwait(false);
  #endregion

  #region Delete Invoice Scan API
  /// <inheritdoc/>
  public async Task DeleteInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceScan));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    invoice.Scans.Remove(scan);

    await invoiceOrchestrationService
      .UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Add Invoice Metadata API
  /// <inheritdoc/>
  public async Task AddMetadataToInvoice(IDictionary<string, object> metadata, Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(AddMetadataToInvoice));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    foreach (var kvp in metadata)
    {
      invoice.AdditionalMetadata[kvp.Key] = kvp.Value;
    }

    await invoiceOrchestrationService
      .UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Update Invoice Metadata API
  /// <inheritdoc/>
  public async Task<IDictionary<string, object>> UpdateMetadataOnInvoice(IDictionary<string, object> metadata, Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMetadataOnInvoice));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    foreach (var kvp in metadata)
    {
      invoice.AdditionalMetadata[kvp.Key] = kvp.Value;
    }

    var updatedInvoice = await invoiceOrchestrationService
      .UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    return updatedInvoice.AdditionalMetadata;
  }).ConfigureAwait(false);
  #endregion

  #region Get Invoice Metadata API
  /// <inheritdoc/>
  public async Task<IDictionary<string, object>> GetMetadataFromInvoice(Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(GetMetadataFromInvoice));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    return invoice.AdditionalMetadata;
  }).ConfigureAwait(false);
  #endregion

  #region Delete Invoice Metadata API
  /// <inheritdoc/>
  public async Task DeleteMetadataFromInvoice(IEnumerable<string> metadataKeys, Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMetadataFromInvoice));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    foreach (var key in metadataKeys)
    {
      invoice.AdditionalMetadata.Remove(key);
    }

    await invoiceOrchestrationService
      .UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion
}
