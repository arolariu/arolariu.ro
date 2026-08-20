namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

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
using DDD = arolariu.Backend.Domain.Invoices.DDD;

/// <summary>
/// Coordinates invoice, merchant, and analysis workflows.
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
  public async Task CreateInvoice(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
    var sw = Stopwatch.StartNew();

    if (invoice.Classification is not null)
    {
      invoice.Classification = await analysisOrchestrationService
        .ResolveManualClassificationAsync(
          invoice.Classification,
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
  /// <param name="cancellationToken">The token used to cancel classification or persistence.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when merchant input or a manual classification code is invalid.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when classification or merchant persistence fails.
  /// </exception>
  public async Task CreateMerchant(Merchant merchant, Guid? parentCompanyId, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchant));
    var sw = Stopwatch.StartNew();

    if (merchant.Classification is not null)
    {
      merchant.Classification = await analysisOrchestrationService
        .ResolveManualClassificationAsync(
          merchant.Classification,
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
  public async Task<Invoice> UpdateInvoice(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoice));
    var sw = Stopwatch.StartNew();

    if (updatedInvoice.Classification is not null)
    {
      updatedInvoice.Classification = await analysisOrchestrationService
        .ResolveManualClassificationAsync(
          updatedInvoice.Classification,
          ClassificationSystem.EcoicopV2,
          cancellationToken)
        .ConfigureAwait(false);
    }

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
  /// <param name="cancellationToken">The token used to cancel classification or persistence.</param>
  /// <returns>The persisted merchant entity.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when replacement input or a manual classification code is invalid.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when classification or merchant persistence fails.
  /// </exception>
  public async Task<Merchant> UpdateMerchant(Merchant updatedMerchant, Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchant));
    var sw = Stopwatch.StartNew();

    if (updatedMerchant.Classification is not null)
    {
      updatedMerchant.Classification = await analysisOrchestrationService
        .ResolveManualClassificationAsync(
          updatedMerchant.Classification,
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
  /// <param name="cancellationToken">The token used to cancel classification or persistence.</param>
  /// <returns>A task that completes after the aggregate update.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when the product is null or its manual classification code is invalid.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when classification or invoice persistence fails.
  /// </exception>
  public async Task AddProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    ArgumentNullException.ThrowIfNull(product);

    using var activity = InvoicePackageTracing.StartActivity(nameof(AddProduct));
    if (product.Classification is not null)
    {
      product.Classification = await analysisOrchestrationService
        .ResolveManualClassificationAsync(
          product.Classification,
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

  #region Update Product API
  /// <summary>Replaces client-editable fields on the first product matching an exact name.</summary>
  /// <param name="productName">The case-insensitive persisted name used to select the first product.</param>
  /// <param name="updatedProduct">The client-editable replacement values.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel classification or persistence.</param>
  /// <returns>The merged product persisted on the invoice.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceValidationException">
  /// Thrown when a required argument is missing, no exact-name product exists, or a classification code is invalid.
  /// </exception>
  public async Task<Product> UpdateProduct(
    string productName,
    Product updatedProduct,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(productName);
    ArgumentNullException.ThrowIfNull(updatedProduct);

    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateProduct));
    activity?.SetInvoiceContext(invoiceIdentifier, userIdentifier);

    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    List<Product> products = [.. invoice.Items];
    int selectedProductIndex = products.FindIndex(product =>
      string.Equals(product.Name, productName, StringComparison.OrdinalIgnoreCase));

    if (selectedProductIndex < 0)
    {
      throw new ProductNotFoundException(invoiceIdentifier);
    }

    Product persistedProduct = products[selectedProductIndex];
    StandardClassification? canonicalClassification = updatedProduct.Classification;

    if (canonicalClassification is not null)
    {
      canonicalClassification = await analysisOrchestrationService
        .ResolveManualClassificationAsync(
          canonicalClassification,
          ClassificationSystem.Gs1Gpc,
          cancellationToken)
        .ConfigureAwait(false);
    }

    var canonicalUpdate = new Product
    {
      Name = updatedProduct.Name,
      Classification = canonicalClassification,
      Quantity = updatedProduct.Quantity,
      QuantityUnit = updatedProduct.QuantityUnit,
      ProductCode = updatedProduct.ProductCode,
      Price = updatedProduct.Price,
      AllergenAssessment = updatedProduct.AllergenAssessment,
    };
    Product mergedProduct = Product.Merge(persistedProduct, canonicalUpdate);
    products[selectedProductIndex] = mergedProduct;
    invoice.Items = products;

    await invoiceOrchestrationService
      .UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    activity?.SetTag("result.product_found", true);
    return mergedProduct;
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
  /// <summary>Returns the first invoice product whose name contains the supplied text.</summary>
  /// <param name="productName">The case-insensitive text to find within a product name.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The first matching product, or a default product when no item matches.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyValidationException">
  /// Thrown when the invoice is unavailable to the request.
  /// </exception>
  public async Task<Product> GetProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(GetProduct));
    var invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);

    var products = invoice.Items;
    var product = products.FirstOrDefault(
      p => p.Name is not null && p.Name.Contains(productName, StringComparison.InvariantCultureIgnoreCase),
      new Product());

    return product;
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
  public async Task DeleteProduct(
    string productName,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
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

  #region Create Invoice Scan API
  /// <summary>Attaches one scan to an existing invoice through invoice orchestration.</summary>
  /// <param name="scan">The scan to attach.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel attachment.</param>
  /// <returns>A task that completes after the aggregate update.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing.InvoiceProcessingServiceDependencyException">
  /// Thrown when invoice orchestration cannot attach the scan.
  /// </exception>
  public async Task CreateInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceScan));
    await invoiceOrchestrationService
      .AttachInvoiceScanAsync(scan, invoiceIdentifier, userIdentifier, cancellationToken)
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
  public async Task DeleteInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
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
  public async Task AddMetadataToInvoice(IDictionary<string, object> metadata, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
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
  public async Task<IDictionary<string, object>> UpdateMetadataOnInvoice(IDictionary<string, object> metadata, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
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
  public async Task DeleteMetadataFromInvoice(IEnumerable<string> metadataKeys, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
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
}
