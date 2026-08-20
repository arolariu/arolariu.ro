namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Common.Telemetry.Tracing;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using Microsoft.Extensions.Logging;
using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using System.Diagnostics.CodeAnalysis;
using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using System.Globalization;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

/// <summary>
/// Coordinates invoice, merchant, and analysis workflows.
/// </summary>
/// <summary>
/// Coordinates analysis queue messages and capability execution.
/// </summary>
public sealed partial class InvoiceProcessingService : IInvoiceProcessingService
{
  private static readonly TimeSpan DefaultRenewalInterval = TimeSpan.FromSeconds(30);
  private static readonly TimeSpan DefaultVisibilityTimeout = TimeSpan.FromMinutes(2);

  private readonly IInvoiceOrchestrationService invoiceOrchestrationService;
  private readonly IMerchantOrchestrationService merchantOrchestrationService;
  private readonly IAnalysisOrchestrationService analysisOrchestrationService;
  private readonly ILogger<IInvoiceProcessingService> logger;
  private readonly TimeSpan renewalInterval;
  private readonly TimeSpan visibilityTimeout;

  /// <summary>
  /// Initializes the unified invoice processing service.
  /// </summary>
  /// <param name="invoiceOrchestrationService">The invoice persistence orchestration boundary.</param>
  /// <param name="merchantOrchestrationService">The merchant persistence orchestration boundary.</param>
  /// <param name="analysisOrchestrationService">The analysis capability and queue orchestration boundary.</param>
  /// <param name="loggerFactory">The logger factory used to create processing telemetry.</param>
  /// <exception cref="ArgumentNullException">Thrown when a required dependency is <see langword="null"/>.</exception>
  public InvoiceProcessingService(
    IInvoiceOrchestrationService invoiceOrchestrationService,
    IMerchantOrchestrationService merchantOrchestrationService,
    IAnalysisOrchestrationService analysisOrchestrationService,
    ILoggerFactory loggerFactory)
    : this(
      invoiceOrchestrationService,
      merchantOrchestrationService,
      analysisOrchestrationService,
      loggerFactory,
      DefaultRenewalInterval,
      DefaultVisibilityTimeout)
  {
  }

  internal InvoiceProcessingService(
    IInvoiceOrchestrationService invoiceOrchestrationService,
    IMerchantOrchestrationService merchantOrchestrationService,
    IAnalysisOrchestrationService analysisOrchestrationService,
    ILoggerFactory loggerFactory,
    TimeSpan renewalInterval,
    TimeSpan visibilityTimeout)
  {
    ArgumentNullException.ThrowIfNull(invoiceOrchestrationService);
    ArgumentNullException.ThrowIfNull(merchantOrchestrationService);
    ArgumentNullException.ThrowIfNull(analysisOrchestrationService);
    ArgumentNullException.ThrowIfNull(loggerFactory);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(renewalInterval, TimeSpan.Zero);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(visibilityTimeout, TimeSpan.Zero);

    this.invoiceOrchestrationService = invoiceOrchestrationService;
    this.merchantOrchestrationService = merchantOrchestrationService;
    this.analysisOrchestrationService = analysisOrchestrationService;
    logger = loggerFactory.CreateLogger<IInvoiceProcessingService>();
    this.renewalInterval = renewalInterval;
    this.visibilityTimeout = visibilityTimeout;
  }


  #region Create Invoice API
  /// <summary>Canonicalizes any manual ECOICOP code and persists a new invoice.</summary>
  /// <param name="invoice">The invoice aggregate to persist.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel classification or persistence.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when invoice input or a manual classification code is invalid.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when classification or invoice persistence fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task CreateInvoice(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
    var sw = Stopwatch.StartNew();

    if (invoice.Classification is not null)
    {
      invoice.Classification = await analysisOrchestrationService
        .ResolveManualClassificationAsync(
          invoice.Classification.Code,
          ClassificationSystem.EcoicopV2,
          cancellationToken)
        .ConfigureAwait(false);
    }

    await invoiceOrchestrationService
      .CreateInvoiceObject(invoice, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    sw.Stop();
    InvoiceMetrics.RecordOperation("create", "invoice", "success", sw.Elapsed.TotalMilliseconds);
  }).ConfigureAwait(false);
  #endregion

  #region Create Merchant API
  /// <summary>Canonicalizes any manual NACE code and persists a new merchant.</summary>
  /// <param name="merchant">The merchant entity to persist.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="classificationCode">The optional NACE 2.1 code to resolve canonically.</param>
  /// <param name="cancellationToken">The token used to cancel classification or persistence.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when merchant input or a manual classification code is invalid.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when classification or merchant persistence fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task CreateMerchant(
    Merchant merchant,
    Guid? parentCompanyId,
    string? classificationCode,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchant));
    var sw = Stopwatch.StartNew();

    if (classificationCode is not null)
    {
      merchant.Classification = await analysisOrchestrationService
        .ResolveManualClassificationAsync(
          classificationCode,
          ClassificationSystem.Nace21,
          cancellationToken)
        .ConfigureAwait(false);
    }

    await merchantOrchestrationService
      .CreateMerchantObject(merchant, parentCompanyId, cancellationToken)
      .ConfigureAwait(false);

    sw.Stop();
    InvoiceMetrics.RecordOperation("create", "merchant", "success", sw.Elapsed.TotalMilliseconds);
  }).ConfigureAwait(false);
  #endregion

  #region Delete Invoice API
  /// <summary>Deletes one invoice through invoice orchestration.</summary>
  /// <param name="identifier">The invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after deletion.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when invoice orchestration cannot complete the deletion.
  /// </exception>
  /// <inheritdoc/>
  public async Task DeleteInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
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
  /// <summary>Reads all invoices in one user partition.</summary>
  /// <param name="userIdentifier">The user partition to query.</param>
  /// <param name="cancellationToken">The token used to cancel the query.</param>
  /// <returns>The invoices returned by invoice orchestration.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when invoice orchestration cannot complete the query.
  /// </exception>
  /// <inheritdoc/>
  public async Task<IEnumerable<Invoice>> ReadInvoices(Guid userIdentifier, CancellationToken cancellationToken) =>
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
  /// <summary>Reads all merchants in one parent-company partition.</summary>
  /// <param name="parentCompanyId">The parent-company partition to query.</param>
  /// <param name="cancellationToken">The token used to cancel the query.</param>
  /// <returns>The merchants returned by merchant orchestration.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when merchant orchestration cannot complete the query.
  /// </exception>
  /// <inheritdoc/>
  public async Task<IEnumerable<Merchant>> ReadMerchants(Guid parentCompanyId, CancellationToken cancellationToken) =>
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
  /// <summary>Reads one invoice through invoice orchestration.</summary>
  /// <param name="identifier">The invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The matching invoice aggregate.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyValidationException">
  /// Thrown when the invoice is unavailable to the request.
  /// </exception>
  /// <inheritdoc/>
  public async Task<Invoice> ReadInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
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
  /// <summary>Reads one merchant through merchant orchestration.</summary>
  /// <param name="identifier">The merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The matching merchant entity.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyValidationException">
  /// Thrown when the merchant is unavailable to the request.
  /// </exception>
  /// <inheritdoc/>
  public async Task<Merchant> ReadMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
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
  /// <summary>Canonicalizes any manual ECOICOP code and replaces an invoice.</summary>
  /// <param name="updatedInvoice">The replacement invoice state.</param>
  /// <param name="invoiceIdentifier">The persisted invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel classification or persistence.</param>
  /// <returns>The persisted invoice aggregate.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when replacement input or a manual classification code is invalid.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when classification or invoice persistence fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<Invoice> UpdateInvoice(
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    Invoice updatedInvoice,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoice));
    var sw = Stopwatch.StartNew();

    if (updatedInvoice.ClassificationCode is not null)
    {
      updatedInvoice.Classification = await analysisOrchestrationService
        .ResolveManualClassificationAsync(
          updatedInvoice.ClassificationCode,
          ClassificationSystem.EcoicopV2,
          cancellationToken)
        .ConfigureAwait(false);
    }

    updatedInvoice.ClassificationCode = null;
    var newInvoice = await invoiceOrchestrationService
      .UpdateInvoiceObject(updatedInvoice, invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    sw.Stop();
    InvoiceMetrics.RecordOperation("update", "invoice", "success", sw.Elapsed.TotalMilliseconds);
    return newInvoice;
  }).ConfigureAwait(false);
  #endregion

  #region Update Merchant API
  /// <summary>Canonicalizes any manual NACE code and replaces a merchant.</summary>
  /// <param name="updatedMerchant">The replacement merchant fields.</param>
  /// <param name="identifier">The persisted merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="classificationCode">The optional NACE 2.1 code to resolve canonically.</param>
  /// <param name="cancellationToken">The token used to cancel classification or persistence.</param>
  /// <returns>The persisted merchant entity.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when replacement input or a manual classification code is invalid.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when classification or merchant persistence fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<Merchant> UpdateMerchant(
    Guid identifier,
    Guid? parentCompanyId,
    Merchant updatedMerchant,
    string? classificationCode,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchant));
    var sw = Stopwatch.StartNew();

    if (classificationCode is not null)
    {
      updatedMerchant.Classification = await analysisOrchestrationService
        .ResolveManualClassificationAsync(
          classificationCode,
          ClassificationSystem.Nace21,
          cancellationToken)
        .ConfigureAwait(false);
    }

    var newMerchant = await merchantOrchestrationService
      .UpdateMerchantObject(updatedMerchant, identifier, parentCompanyId, cancellationToken)
      .ConfigureAwait(false);

    sw.Stop();
    InvoiceMetrics.RecordOperation("update", "merchant", "success", sw.Elapsed.TotalMilliseconds);
    return newMerchant;
  }).ConfigureAwait(false);
  #endregion

  #region Delete Merchant API
  /// <summary>Deletes one merchant through merchant orchestration.</summary>
  /// <param name="identifier">The merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after deletion.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when merchant orchestration cannot complete the deletion.
  /// </exception>
  /// <inheritdoc/>
  public async Task DeleteMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
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
  /// <summary>Canonicalizes any manual GS1 GPC code and appends a product to an invoice.</summary>
  /// <param name="product">The product to append.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="classificationCode">The optional GS1 GPC code to resolve canonically.</param>
  /// <param name="cancellationToken">The token used to cancel classification or persistence.</param>
  /// <returns>A task that completes after the aggregate update.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when the product is null or its manual classification code is invalid.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when classification or invoice persistence fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task AddProduct(
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    Product product,
    string? classificationCode,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    ArgumentNullException.ThrowIfNull(product);

    using var activity = InvoicePackageTracing.StartActivity(nameof(AddProduct));
    if (classificationCode is not null)
    {
      product.Classification = await analysisOrchestrationService
        .ResolveManualClassificationAsync(
          classificationCode,
          ClassificationSystem.Gs1Gpc,
          cancellationToken)
        .ConfigureAwait(false);
    }

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
  /// <summary>Returns every product currently stored on an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The invoice's product collection.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyValidationException">
  /// Thrown when the invoice is unavailable to the request.
  /// </exception>
  /// <inheritdoc/>
  public async Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
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
  /// <summary>Returns the first invoice product whose name exactly matches the supplied text.</summary>
  /// <param name="productName">The case-insensitive exact product name.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The first exact-name product.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyValidationException">
  /// Thrown when the invoice is unavailable to the request.
  /// </exception>
  /// <inheritdoc/>
  public async Task<Product> GetProduct(Guid invoiceIdentifier, Guid? userIdentifier, string productName, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(GetProduct));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    return invoice.Items.FirstOrDefault(product =>
      string.Equals(product.Name, productName, StringComparison.OrdinalIgnoreCase))
      ?? throw new ProductNotFoundException(invoiceIdentifier);
  }).ConfigureAwait(false);
  #endregion

  #region Delete Product API
  /// <summary>Removes the first product matching an exact case-insensitive name.</summary>
  /// <param name="productName">The persisted product name used for selection.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read or update.</param>
  /// <returns>A task that completes after the aggregate update.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when the name is blank or no exact-name product exists.
  /// </exception>
  /// <inheritdoc/>
  public async Task DeleteProduct(
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    string productName,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(productName);

    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteProduct));
    activity?.SetInvoiceContext(invoiceIdentifier, userIdentifier);

    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    Product persistedProduct = invoice.Items.FirstOrDefault(product =>
      string.Equals(product.Name, productName, StringComparison.OrdinalIgnoreCase))
      ?? throw new ProductNotFoundException(invoiceIdentifier);

    if (!invoice.Items.Remove(persistedProduct))
    {
      throw new ProductNotFoundException(invoiceIdentifier);
    }

    await invoiceOrchestrationService
      .UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    activity?.SetTag("result.product_found", true);
  }).ConfigureAwait(false);
  #endregion

  #region Delete Invoices API
  /// <summary>Deletes every invoice returned for one user partition.</summary>
  /// <param name="userIdentifier">The user partition whose invoices are deleted.</param>
  /// <param name="cancellationToken">The token checked before each deletion and passed downstream.</param>
  /// <returns>A task that completes after all returned invoices are deleted.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when the partition query or any invoice deletion fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task DeleteInvoices(Guid userIdentifier, CancellationToken cancellationToken) =>
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

  #region Attach Invoice Scan API
  /// <summary>Attaches one scan to an existing invoice through invoice orchestration.</summary>
  /// <param name="scan">The scan to attach.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel attachment.</param>
  /// <returns>A task that completes after the aggregate update.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when invoice orchestration cannot attach the scan.
  /// </exception>
  /// <inheritdoc/>
  public async Task AttachInvoiceScan(Guid invoiceIdentifier, Guid? userIdentifier, InvoiceScan scan, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(AttachInvoiceScan));
    await invoiceOrchestrationService
      .AttachInvoiceScanAsync(invoiceIdentifier, userIdentifier, scan, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Read Invoice Scans API
  /// <summary>Reads all scans currently attached to an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The invoice's scan collection.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyValidationException">
  /// Thrown when the invoice is unavailable to the request.
  /// </exception>
  /// <inheritdoc/>
  public async Task<IEnumerable<InvoiceScan>> ReadInvoiceScans(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
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
  /// <summary>Removes the supplied scan value from an invoice and persists the aggregate.</summary>
  /// <param name="scan">The scan value to remove.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read or update.</param>
  /// <returns>A task that completes after the aggregate update.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when invoice orchestration cannot read or persist the invoice.
  /// </exception>
  /// <inheritdoc/>
  public async Task DeleteInvoiceScan(Guid invoiceIdentifier, Guid? userIdentifier, InvoiceScan scan, CancellationToken cancellationToken) =>
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
  /// <summary>Adds or replaces supplied metadata entries and persists the invoice once.</summary>
  /// <param name="metadata">The metadata entries to merge into the invoice dictionary.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read or update.</param>
  /// <returns>A task that completes after the aggregate update.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when invoice orchestration cannot read or persist the invoice.
  /// </exception>
  /// <inheritdoc/>
  public async Task AddMetadataToInvoice(Guid invoiceIdentifier, Guid? userIdentifier, IDictionary<string, object> metadata, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(AddMetadataToInvoice));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    // No cancellation checkpoint: this loop only mutates an in-memory dictionary.
    // The surrounding read/update calls carry the token and are the real cancellation points.
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
  /// <summary>Upserts supplied metadata entries and returns the persisted dictionary.</summary>
  /// <param name="metadata">The metadata entries to merge into the invoice dictionary.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read or update.</param>
  /// <returns>The complete metadata dictionary from the persisted invoice.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when invoice orchestration cannot read or persist the invoice.
  /// </exception>
  /// <inheritdoc/>
  public async Task<IDictionary<string, object>> UpdateMetadataOnInvoice(Guid invoiceIdentifier, Guid? userIdentifier, IDictionary<string, object> metadata, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMetadataOnInvoice));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    // No cancellation checkpoint: this loop only mutates an in-memory dictionary.
    // The surrounding read/update calls carry the token and are the real cancellation points.
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
  /// <summary>Returns the complete metadata dictionary stored on an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The invoice's persisted metadata dictionary.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyValidationException">
  /// Thrown when the invoice is unavailable to the request.
  /// </exception>
  /// <inheritdoc/>
  public async Task<IDictionary<string, object>> GetMetadataFromInvoice(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
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
  /// <summary>Removes selected metadata keys and persists the invoice once.</summary>
  /// <param name="metadataKeys">The metadata keys to remove when present.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read or update.</param>
  /// <returns>A task that completes after the aggregate update.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when invoice orchestration cannot read or persist the invoice.
  /// </exception>
  /// <inheritdoc/>
  public async Task DeleteMetadataFromInvoice(Guid invoiceIdentifier, Guid? userIdentifier, IEnumerable<string> metadataKeys, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMetadataFromInvoice));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    // No cancellation checkpoint: this loop only mutates an in-memory dictionary.
    // The surrounding read/update calls carry the token and are the real cancellation points.
    foreach (var key in metadataKeys)
    {
      invoice.AdditionalMetadata.Remove(key);
    }

    await invoiceOrchestrationService
      .UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  private const long MaximumDequeueCount = 5;

  /// <summary>Dequeues and processes at most one analysis message under bounded retry policy.</summary>
  /// <param name="cancellationToken">The token used to cancel dequeue, execution, persistence, or deletion.</param>
  /// <returns><see langword="true"/> when a message was dequeued, including malformed messages; otherwise, <see langword="false"/>.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when queue ownership, target access, persistence, or deletion fails outside a classified capability result.
  /// </exception>
  /// <inheritdoc/>
  public async Task<bool> ProcessAnalysisAsync(CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(async () =>
    {
      AnalysisQueueReceipt? receipt = await ReceiveNextAnalysisAsync(cancellationToken).ConfigureAwait(false);

      if (receipt is null)
      {
        return false;
      }

      if (receipt.IsMalformed)
      {
        if (receipt.DequeueCount >= MaximumDequeueCount)
        {
          await DeleteAnalysisAsync(
            receipt,
            AnalysisFailureReason.InvalidStructuredOutput,
            cancellationToken).ConfigureAwait(false);
        }

        return true;
      }

      QueueAnalysisMessage message = receipt.Message
        ?? throw new InvalidOperationException("A valid analysis queue receipt must contain a message.");
      _ = ActivityContext.TryParse(
        message.TraceParent,
        traceState: null,
        isRemote: true,
        out ActivityContext parentContext);
      using var activity = InvoicePackageTracing.StartActivity(
        nameof(ProcessAnalysisAsync),
        ActivityKind.Consumer,
        parentContext);
      activity?.SetTag("analysis.correlation_id", message.CorrelationId);
      activity?.SetTag("analysis.target_type", message.TargetType);
      AnalysisFailureReason? failureReason = await ExecuteWithVisibilityRenewalAsync(
        receipt,
        renewalToken => ExecuteAnalysisAttemptAsync(message, renewalToken),
        cancellationToken).ConfigureAwait(false);

      if (!failureReason.HasValue || receipt.DequeueCount >= MaximumDequeueCount)
      {
        await DeleteAnalysisAsync(receipt, failureReason, cancellationToken).ConfigureAwait(false);
      }

      return true;
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "Every queue attempt must be reduced to a bounded failure reason so Azure Queue can apply retry or terminal deletion policy.")]
  private async Task<AnalysisFailureReason?> ExecuteAnalysisAttemptAsync(
    QueueAnalysisMessage message,
    CancellationToken cancellationToken)
  {
    try
    {
      return message.TargetType switch
      {
        AnalysisTargetType.Invoice
          => await ExecuteInvoiceAnalysisAttemptAsync(message, cancellationToken).ConfigureAwait(false),
        AnalysisTargetType.Merchant
          => await ExecuteMerchantAnalysisAttemptAsync(message, cancellationToken).ConfigureAwait(false),
        _ => AnalysisFailureReason.UnsupportedTarget,
      };
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (Exception exception)
    {
      return ResolveExecutionFailureReason(exception);
    }
  }

  private async Task<AnalysisFailureReason?> ExecuteInvoiceAnalysisAttemptAsync(
    QueueAnalysisMessage message,
    CancellationToken cancellationToken)
  {
    Invoice invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(
        message.TargetId,
        message.TargetPartitionIdentifier ?? message.RequestedBy,
        cancellationToken)
      .ConfigureAwait(false);

    InvoiceAnalysisExecutionResult executionResult = await ExecuteInvoiceAnalysisAsync(
      message,
      invoice,
      cancellationToken).ConfigureAwait(false);

    if (executionResult.Failed)
    {
      return executionResult.FailureReason;
    }

    _ = await PersistInvoiceAnalysisAsync(executionResult, cancellationToken).ConfigureAwait(false);
    return null;
  }

  private async Task<AnalysisFailureReason?> ExecuteMerchantAnalysisAttemptAsync(
    QueueAnalysisMessage message,
    CancellationToken cancellationToken)
  {
    Merchant merchant = await merchantOrchestrationService
      .ReadMerchantObject(message.TargetId, message.TargetPartitionIdentifier, cancellationToken)
      .ConfigureAwait(false);

    MerchantAnalysisExecutionResult executionResult = await ExecuteMerchantAnalysisAsync(
      message,
      merchant,
      cancellationToken).ConfigureAwait(false);

    if (executionResult.Failed)
    {
      return executionResult.FailureReason;
    }

    _ = await PersistMerchantAnalysisAsync(executionResult, cancellationToken).ConfigureAwait(false);
    return null;
  }

  private static AnalysisFailureReason ResolveExecutionFailureReason(Exception exception)
  {
    if (ContainsExceptionMarker<INotFoundException>(exception))
    {
      return AnalysisFailureReason.DependencyValidation;
    }

    if (ContainsExceptionMarker<ITimeoutException>(exception))
    {
      return AnalysisFailureReason.Dependency;
    }

    if (ContainsExceptionMarker<IDependencyValidationException>(exception))
    {
      return AnalysisFailureReason.DependencyValidation;
    }

    if (ContainsExceptionMarker<IDependencyException>(exception))
    {
      return AnalysisFailureReason.Dependency;
    }

    if (ContainsExceptionMarker<IValidationException>(exception))
    {
      return AnalysisFailureReason.Validation;
    }

    return AnalysisFailureReason.TargetPersistence;
  }

  private static bool ContainsExceptionMarker<TMarker>(Exception exception)
  {
    Exception? current = exception;

    while (current is not null)
    {
      if (current is TMarker)
      {
        return true;
      }

      current = current.InnerException;
    }

    return false;
  }

  /// <summary>Validates invoice ownership and publishes a resolved durable analysis request.</summary>
  /// <param name="invoiceId">The invoice identifier to analyze.</param>
  /// <param name="userIdentifier">The authenticated invoice owner.</param>
  /// <param name="request">The requested profile and capability overrides.</param>
  /// <param name="cancellationToken">The token used to cancel validation or publication.</param>
  /// <returns>The provider-assigned string message identifier.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when the request cannot be converted to valid analysis options.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyValidationException">
  /// Thrown when the target invoice is unavailable to the requester.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when target lookup or queue publication fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<string> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    InvoiceAnalysisRequestDto request,
    CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(QueueInvoiceAnalysisAsync));
      _ = await invoiceOrchestrationService
        .ReadInvoiceObject(invoiceId, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
      InvoiceAnalysisOptions options = request.ToInvoiceAnalysisOptions();
      QueueAnalysisMessage message = QueueAnalysisMessage.CreateInvoiceMessage(
        invoiceId,
        userIdentifier,
        Guid.CreateVersion7(),
        options,
        ResolveTraceId());

      string messageId = await analysisOrchestrationService
        .EnqueueAnalysisAsync(message, cancellationToken)
        .ConfigureAwait(false);

      InvoiceMetrics.RecordAnalysisMessageQueued(AnalysisTargetType.Invoice);
      logger.LogAnalysisMessageQueued(message.CorrelationId, AnalysisTargetType.Invoice);
      return messageId;
    }).ConfigureAwait(false);

  /// <summary>Validates merchant ownership and publishes a resolved durable analysis request.</summary>
  /// <param name="merchantId">The merchant identifier to analyze.</param>
  /// <param name="userIdentifier">The authenticated requester.</param>
  /// <param name="request">The requested profile and capability overrides.</param>
  /// <param name="cancellationToken">The token used to cancel validation or publication.</param>
  /// <returns>The provider-assigned string message identifier.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when the request cannot be converted to valid analysis options.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyValidationException">
  /// Thrown when the target merchant is unavailable or not owned by the requester.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when target lookup or queue publication fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<string> QueueMerchantAnalysisAsync(
    Guid merchantId,
    Guid userIdentifier,
    MerchantAnalysisRequestDto request,
    CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(QueueMerchantAnalysisAsync));
      Merchant merchant = await merchantOrchestrationService
        .ReadMerchantObject(merchantId, parentCompanyId: null, cancellationToken)
        .ConfigureAwait(false);

      if (merchant.CreatedBy != Guid.Empty && merchant.CreatedBy != userIdentifier)
      {
        throw new MerchantForbiddenAccessException(merchantId, userIdentifier);
      }

      MerchantAnalysisOptions options = request.ToMerchantAnalysisOptions();
      QueueAnalysisMessage message = QueueAnalysisMessage.CreateMerchantMessage(
        merchant.id,
        userIdentifier,
        Guid.CreateVersion7(),
        merchant.ParentCompanyId,
        options,
        ResolveTraceId());

      string messageId = await analysisOrchestrationService
        .EnqueueAnalysisAsync(message, cancellationToken)
        .ConfigureAwait(false);

      InvoiceMetrics.RecordAnalysisMessageQueued(AnalysisTargetType.Merchant);
      logger.LogAnalysisMessageQueued(message.CorrelationId, AnalysisTargetType.Merchant);
      return messageId;
    }).ConfigureAwait(false);

  /// <summary>Dequeues at most one visible analysis message using the configured visibility timeout.</summary>
  /// <param name="cancellationToken">The token used to cancel dequeue.</param>
  /// <returns>The provider-neutral receipt, or <see langword="null"/> when no message is visible.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when analysis orchestration cannot complete the dequeue.
  /// </exception>
  /// <inheritdoc/>
  public async Task<AnalysisQueueReceipt?> ReceiveNextAnalysisAsync(CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReceiveNextAnalysisAsync));
      return await analysisOrchestrationService
        .ReceiveAnalysisAsync(visibilityTimeout, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Executes an operation while periodically renewing ownership of its queue message.</summary>
  /// <typeparam name="TResult">The coordinated operation's result type.</typeparam>
  /// <param name="receipt">The currently owned queue receipt.</param>
  /// <param name="operation">The operation invoked with a token linked to visibility ownership.</param>
  /// <param name="cancellationToken">The token used to cancel execution and renewal.</param>
  /// <returns>The operation result when execution and all required renewals succeed.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="receipt"/> or <paramref name="operation"/> is null.</exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when visibility renewal fails and exclusive message ownership can no longer be assumed.
  /// </exception>
  /// <inheritdoc/>
  [SuppressMessage(
    "Reliability",
    "CA2025:Ensure tasks using 'IDisposable' instances complete before the instances are disposed",
    Justification = "The visibility-renewal task is always awaited before the cancellation source is disposed.")]
  public async Task<TResult> ExecuteWithVisibilityRenewalAsync<TResult>(
    AnalysisQueueReceipt receipt,
    Func<CancellationToken, Task<TResult>> operation,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(receipt);
    ArgumentNullException.ThrowIfNull(operation);

    using var renewalCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    var failure = new VisibilityFailureBox();
    Task renewal = RenewVisibilityUntilCancelledAsync(receipt, failure, renewalCts);
    TResult? result = default;

    try
    {
      result = await operation(renewalCts.Token).ConfigureAwait(false);
    }
    catch (OperationCanceledException) when (failure.Exception is not null)
    {
    }
    finally
    {
      await renewalCts.CancelAsync().ConfigureAwait(false);
      await renewal.ConfigureAwait(false);
    }

    if (failure.Exception is not null)
    {
      throw failure.Exception;
    }

    return result!;
  }

  /// <summary>Deletes a completed or terminally failed analysis message and records its terminal outcome.</summary>
  /// <param name="receipt">The receipt containing the provider message ID and current pop receipt.</param>
  /// <param name="failureReason">The terminal failure reason to record, or <see langword="null"/> for success.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after deletion and terminal logging.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when analysis orchestration cannot delete the queue message.
  /// </exception>
  /// <inheritdoc/>
  public async Task DeleteAnalysisAsync(
    AnalysisQueueReceipt receipt,
    AnalysisFailureReason? failureReason,
    CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteAnalysisAsync));
      await analysisOrchestrationService.DeleteAnalysisAsync(receipt, cancellationToken).ConfigureAwait(false);

      if (failureReason.HasValue)
      {
        if (receipt.Message is not null)
        {
          logger.LogAnalysisProcessingRunFailed(
            receipt.Message.CorrelationId,
            failureReason.Value);
        }
        else
        {
          logger.LogMalformedAnalysisMessageDeleted(
            receipt.MessageId,
            receipt.DequeueCount,
            failureReason.Value);
        }
      }
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "Any visibility-renewal failure invalidates message ownership and must cancel the coordinated execution scope.")]
  private async Task RenewVisibilityUntilCancelledAsync(
    AnalysisQueueReceipt receipt,
    VisibilityFailureBox failure,
    CancellationTokenSource renewalCts)
  {
    CancellationToken renewalToken = renewalCts.Token;

    while (!renewalToken.IsCancellationRequested)
    {
      try
      {
        await Task.Delay(renewalInterval, renewalToken).ConfigureAwait(false);
        await analysisOrchestrationService
          .RenewAnalysisVisibilityAsync(receipt, visibilityTimeout, renewalToken)
          .ConfigureAwait(false);
      }
      catch (OperationCanceledException) when (renewalToken.IsCancellationRequested)
      {
        return;
      }
      catch (Exception exception)
      {
        failure.Exception = new InvoiceProcessingServiceDependencyException(exception);
        await renewalCts.CancelAsync().ConfigureAwait(false);
        return;
      }
    }
  }

  private static string ResolveTraceId()
  {
    string? ambient = Activity.Current?.Id;

    if (!string.IsNullOrWhiteSpace(ambient))
    {
      return ambient;
    }

    return string.Format(
      CultureInfo.InvariantCulture,
      "00-{0}-{1}-00",
      ActivityTraceId.CreateRandom().ToHexString(),
      ActivitySpanId.CreateRandom().ToHexString());
  }

  private sealed class VisibilityFailureBox
  {
    internal InvoiceProcessingServiceDependencyException? Exception { get; set; }
  }

  /// <summary>Executes invoice capabilities through analysis orchestration without persistence.</summary>
  /// <param name="message">The durable invoice request containing resolved options.</param>
  /// <param name="invoice">The invoice snapshot to analyze.</param>
  /// <param name="cancellationToken">The token used to cancel capability execution.</param>
  /// <returns>The immutable invoice analysis execution result.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when analysis orchestration rejects the request input.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when an analysis dependency fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<InvoiceAnalysisExecutionResult> ExecuteInvoiceAnalysisAsync(
    QueueAnalysisMessage message,
    Invoice invoice,
    CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(() => analysisOrchestrationService.ExecuteInvoiceAnalysisAsync(
      message,
      invoice,
      cancellationToken)).ConfigureAwait(false);

  /// <summary>Executes merchant capabilities through analysis orchestration without persistence.</summary>
  /// <param name="message">The durable merchant request containing resolved options.</param>
  /// <param name="merchant">The merchant snapshot to analyze.</param>
  /// <param name="cancellationToken">The token used to cancel capability execution.</param>
  /// <returns>The immutable merchant analysis execution result.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when analysis orchestration rejects the request input.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when an analysis dependency fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<MerchantAnalysisExecutionResult> ExecuteMerchantAnalysisAsync(
    QueueAnalysisMessage message,
    Merchant merchant,
    CancellationToken cancellationToken) =>
    await TryCatchAnalysisAsync(() => analysisOrchestrationService.ExecuteMerchantAnalysisAsync(
      message,
      merchant,
      cancellationToken)).ConfigureAwait(false);

  private const string InvariantNumberFormat = "0.############################";

  /// <summary>Applies an immutable invoice analysis patch and persists the target invoice.</summary>
  /// <param name="executionResult">The successful invoice execution result containing the durable message and target patch.</param>
  /// <param name="cancellationToken">The token used to cancel target lookup or persistence.</param>
  /// <returns>The supplied execution result after the invoice update completes.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when <paramref name="executionResult"/> is null.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyValidationException">
  /// Thrown when the target invoice is unavailable.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when invoice persistence fails.
  /// </exception>
  /// <inheritdoc/>
  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "A persistence failure after analysis must be surfaced so the management layer can fail the durable run explicitly.")]
  private async Task<InvoiceAnalysisExecutionResult> PersistInvoiceAnalysisAsync(
    InvoiceAnalysisExecutionResult executionResult,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PersistInvoiceAnalysisAsync));
      ArgumentNullException.ThrowIfNull(executionResult);

      QueueAnalysisMessage message = executionResult.Message;
      Invoice invoice = await invoiceOrchestrationService
        .ReadInvoiceObject(
          message.TargetId,
          message.TargetPartitionIdentifier ?? message.RequestedBy,
          cancellationToken)
        .ConfigureAwait(false);

      ArgumentNullException.ThrowIfNull(invoice);

      InvoiceAnalysisPatch patch = executionResult.TargetPatch;

      ApplyInvoicePatch(invoice, patch, message.CorrelationId);
      activity?.SetTag("analysis.patch_has_changes", patch.HasChanges);

      await invoiceOrchestrationService
        .UpdateInvoiceObject(invoice, invoice.id, invoice.UserIdentifier, cancellationToken)
        .ConfigureAwait(false);

      return executionResult;
    }).ConfigureAwait(false);

  /// <summary>Applies an immutable merchant analysis patch and persists the target merchant.</summary>
  /// <param name="executionResult">The successful merchant execution result containing the durable message and target patch.</param>
  /// <param name="cancellationToken">The token used to cancel target lookup or persistence.</param>
  /// <returns>The supplied execution result after the merchant update completes.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when <paramref name="executionResult"/> is null.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyValidationException">
  /// Thrown when the target merchant is unavailable.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when merchant persistence fails.
  /// </exception>
  /// <inheritdoc/>
  private async Task<MerchantAnalysisExecutionResult> PersistMerchantAnalysisAsync(
    MerchantAnalysisExecutionResult executionResult,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PersistMerchantAnalysisAsync));
      ArgumentNullException.ThrowIfNull(executionResult);

      QueueAnalysisMessage message = executionResult.Message;
      Merchant merchant = await merchantOrchestrationService
        .ReadMerchantObject(message.TargetId, message.TargetPartitionIdentifier, cancellationToken)
        .ConfigureAwait(false);

      ArgumentNullException.ThrowIfNull(merchant);
      ApplyMerchantPatch(merchant, executionResult.TargetPatch);
      activity?.SetTag("analysis.patch_has_changes", executionResult.TargetPatch.HasChanges);

      await merchantOrchestrationService
        .UpdateMerchantObject(
          merchant,
          merchant.id,
          message.TargetPartitionIdentifier,
          cancellationToken)
        .ConfigureAwait(false);

      return executionResult;
    }).ConfigureAwait(false);

  private static void ApplyInvoicePatch(Invoice invoice, InvoiceAnalysisPatch patch, Guid sourceRunId)
  {
    if (patch.ExtractionUpdate is not null)
    {
      ApplyExtraction(invoice, patch.ExtractionUpdate);
    }

    if (patch.SummaryUpdate is not null)
    {
      invoice.Name = patch.SummaryUpdate.Name;
      invoice.Description = patch.SummaryUpdate.Description;
    }

    if (patch.ProductClassificationUpdate is not null)
    {
      ApplyProductClassifications(invoice, patch.ProductClassificationUpdate);
    }

    if (patch.AllergenAssessmentUpdate is not null)
    {
      ApplyAllergenAssessments(invoice, patch.AllergenAssessmentUpdate, sourceRunId);
    }

    if (patch.InvoiceClassificationUpdate is not null)
    {
      invoice.Classification = patch.InvoiceClassificationUpdate.Classification;
    }

    if (patch.RecipeGenerationUpdate is not null)
    {
      invoice.PossibleRecipes = [.. patch.RecipeGenerationUpdate.Recipes];
    }
  }

  private static void ApplyMerchantPatch(Merchant merchant, MerchantAnalysisPatch patch)
  {
    if (patch.ClassificationUpdate is not null)
    {
      merchant.Classification = patch.ClassificationUpdate.Classification;
    }

    if (patch.DescriptionUpdate is not null)
    {
      merchant.Description = patch.DescriptionUpdate.Description;
    }
  }

  private static List<Product> ReconcileExtractedProducts(
    IEnumerable<Product>? previousItems,
    IReadOnlyList<ExtractedProduct> extractedProducts)
  {
    ArgumentNullException.ThrowIfNull(extractedProducts);

    ProductCarryOverIndex carryOver = ProductCarryOverIndex.Build(previousItems);
    var reconciled = new List<Product>(extractedProducts.Count);

    foreach (ExtractedProduct extracted in extractedProducts)
    {
      Product product = ExtractedProductMapper.ToDomainProduct(extracted);
      Product? previous = carryOver.TryTake(product);

      if (previous is not null)
      {
        product.Classification = previous.Classification;
        product.AllergenAssessment = previous.AllergenAssessment;

        ProductMetadata metadata = previous.Metadata;
        metadata.Confidence = product.Metadata.Confidence;
        product.Metadata = metadata;
      }

      reconciled.Add(product);
    }

    return reconciled;
  }

  private static string? BuildProductCodeKey(string? productCode) =>
    string.IsNullOrWhiteSpace(productCode) ? null : productCode.Trim().ToUpperInvariant();

  private static string BuildProductAttributeKey(Product product) => string.Concat(
    NormalizeProductName(product.Name),
    "|",
    product.Quantity.ToString(InvariantNumberFormat, CultureInfo.InvariantCulture),
    "|",
    product.Price.ToString(InvariantNumberFormat, CultureInfo.InvariantCulture));

  private static string NormalizeProductName(string? name) =>
    string.IsNullOrWhiteSpace(name)
      ? string.Empty
      : string.Join(
          ' ',
          name.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        .ToUpperInvariant();

  private sealed class ProductCarryOverIndex
  {
    private readonly Dictionary<string, Queue<ProductCarryOverEntry>> byProductCode = new(StringComparer.Ordinal);
    private readonly Dictionary<string, Queue<ProductCarryOverEntry>> byAttributes = new(StringComparer.Ordinal);

    internal static ProductCarryOverIndex Build(IEnumerable<Product>? previousItems)
    {
      var index = new ProductCarryOverIndex();

      if (previousItems is null)
      {
        return index;
      }

      foreach (Product previous in previousItems)
      {
        if (previous is null)
        {
          continue;
        }

        var entry = new ProductCarryOverEntry(previous);
        string? productCodeKey = BuildProductCodeKey(previous.ProductCode);

        if (productCodeKey is not null)
        {
          Enqueue(index.byProductCode, productCodeKey, entry);
        }

        Enqueue(index.byAttributes, BuildProductAttributeKey(previous), entry);
      }

      return index;
    }

    internal Product? TryTake(Product candidate)
    {
      string? productCodeKey = BuildProductCodeKey(candidate.ProductCode);

      if (productCodeKey is not null && TryDequeue(byProductCode, productCodeKey, out Product? byCode))
      {
        return byCode;
      }

      return TryDequeue(byAttributes, BuildProductAttributeKey(candidate), out Product? byAttribute)
        ? byAttribute
        : null;
    }

    private static void Enqueue(
      Dictionary<string, Queue<ProductCarryOverEntry>> index,
      string key,
      ProductCarryOverEntry entry)
    {
      if (!index.TryGetValue(key, out Queue<ProductCarryOverEntry>? queue))
      {
        queue = new Queue<ProductCarryOverEntry>();
        index[key] = queue;
      }

      queue.Enqueue(entry);
    }

    private static bool TryDequeue(
      Dictionary<string, Queue<ProductCarryOverEntry>> index,
      string key,
      out Product? matched)
    {
      matched = null;

      if (!index.TryGetValue(key, out Queue<ProductCarryOverEntry>? queue))
      {
        return false;
      }

      while (queue.Count > 0)
      {
        ProductCarryOverEntry entry = queue.Dequeue();

        if (entry.Consumed)
        {
          continue;
        }

        entry.Consumed = true;
        matched = entry.Product;
        return true;
      }

      return false;
    }
  }

  private sealed class ProductCarryOverEntry(Product product)
  {
    internal Product Product { get; } = product;

    internal bool Consumed { get; set; }
  }

  private static void ApplyExtraction(Invoice invoice, ReceiptExtractionResult extraction)
  {
    invoice.Items = ReconcileExtractedProducts(invoice.Items, extraction.Products);
    invoice.PaymentInformation = extraction.PaymentInformation;
    invoice.ReceiptType = extraction.ReceiptType;
    invoice.CountryRegion = extraction.CountryRegion;
    invoice.TaxDetails = [.. extraction.TaxDetails];
    invoice.Payments = [.. extraction.Payments];
  }

  private static void ApplyProductClassifications(Invoice invoice, ProductClassificationResult classifications)
  {
    var items = invoice.Items as IList<Product> ?? [.. invoice.Items];

    for (int index = 0; index < items.Count; index++)
    {
      string token = AnalysisCorrelationTokens.ForProduct(index);

      if (classifications.Classifications.TryGetValue(token, out StandardClassification? classification))
      {
        items[index].Classification = classification;
      }
    }
  }

  private static void ApplyAllergenAssessments(
    Invoice invoice,
    ProductAllergenAssessmentResult assessments,
    Guid sourceRunId)
  {
    var items = invoice.Items as IList<Product> ?? [.. invoice.Items];

    for (int index = 0; index < items.Count; index++)
    {
      string token = AnalysisCorrelationTokens.ForProduct(index);

      if (assessments.Assessments.TryGetValue(token, out ProductAllergenAssessment? assessment))
      {
        items[index].AllergenAssessment = ToPersistedAssessment(assessment, sourceRunId);
      }
    }
  }

  private static AllergenAssessment ToPersistedAssessment(ProductAllergenAssessment assessment, Guid sourceRunId) =>
    assessment.Status switch
    {
      ProductAllergenAssessmentStatus.SignalsFound => AllergenAssessment.Detected(
        sourceRunId,
        [.. assessment.Signals.Select(ToPersistedSignal)]),
      ProductAllergenAssessmentStatus.NoSignalsInAvailableEvidence => AllergenAssessment.NoSignals(sourceRunId),
      _ => AllergenAssessment.Insufficient(sourceRunId),
    };

  private static AllergenSignal ToPersistedSignal(ProductAllergenSignal signal) => new(
    signal.Code,
    ToEvidenceLevel(signal.EvidenceTier),
    signal.Confidence,
    signal.Evidence);

  private static AllergenEvidenceLevel ToEvidenceLevel(ProductAllergenEvidenceTier tier) => tier switch
  {
    ProductAllergenEvidenceTier.Declared => AllergenEvidenceLevel.Explicit,
    ProductAllergenEvidenceTier.Likely => AllergenEvidenceLevel.Inferred,
    _ => AllergenEvidenceLevel.Precautionary,
  };
}
