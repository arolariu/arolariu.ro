namespace arolariu.Backend.Domain.Invoices.Services.Management;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Routes endpoint and worker requests through the unified invoice Processing boundary.
/// </summary>
public sealed partial class InvoiceManagementService : IInvoiceManagementService
{
  private readonly IInvoiceProcessingService invoiceProcessingService;
  private readonly ILogger<IInvoiceManagementService> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceManagementService"/> class.
  /// </summary>
  /// <param name="invoiceProcessingService">The unified Processing boundary for invoice-domain operations.</param>
  /// <param name="loggerFactory">The factory used to create the Management service logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when either dependency is <see langword="null"/>.</exception>
  public InvoiceManagementService(
    IInvoiceProcessingService invoiceProcessingService,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(invoiceProcessingService);
    ArgumentNullException.ThrowIfNull(loggerFactory);

    this.invoiceProcessingService = invoiceProcessingService;
    logger = loggerFactory.CreateLogger<IInvoiceManagementService>();
  }

  /// <summary>Creates an invoice through the unified Processing boundary.</summary>
  /// <param name="invoice">The invoice aggregate to persist.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementValidationException">
  /// Thrown when Processing rejects the invoice input.
  /// </exception>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when a downstream classification or persistence dependency fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task CreateInvoice(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
      await invoiceProcessingService.CreateInvoice(invoice, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Reads one invoice through the unified Processing boundary.</summary>
  /// <param name="identifier">The invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The matching invoice aggregate.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyValidationException">
  /// Thrown when the invoice is unavailable to the request.
  /// </exception>
  /// <inheritdoc/>
  public async Task<Invoice> ReadInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoice));
      return await invoiceProcessingService.ReadInvoice(identifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Reads every invoice in one user partition through Processing.</summary>
  /// <param name="userIdentifier">The user partition to query.</param>
  /// <param name="cancellationToken">The token used to cancel the query.</param>
  /// <returns>The invoices visible in the partition.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when the persistence dependency cannot complete the query.
  /// </exception>
  /// <inheritdoc/>
  public async Task<IEnumerable<Invoice>> ReadInvoices(Guid userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoices));
      return await invoiceProcessingService.ReadInvoices(userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Replaces client-editable invoice state through Processing.</summary>
  /// <param name="updatedInvoice">The replacement invoice values.</param>
  /// <param name="invoiceIdentifier">The persisted invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>The persisted invoice aggregate.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementValidationException">
  /// Thrown when replacement input or a manual classification code is invalid.
  /// </exception>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when a downstream classification or persistence dependency fails.
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
      return await invoiceProcessingService
        .UpdateInvoice(invoiceIdentifier, userIdentifier, updatedInvoice, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Deletes one invoice through Processing.</summary>
  /// <param name="identifier">The invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after deletion.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when the persistence dependency cannot complete deletion.
  /// </exception>
  /// <inheritdoc/>
  public async Task DeleteInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoice));
      await invoiceProcessingService.DeleteInvoice(identifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Deletes every invoice in one user partition through Processing.</summary>
  /// <param name="userIdentifier">The user partition whose invoices are deleted.</param>
  /// <param name="cancellationToken">The token used to cancel enumeration or deletion.</param>
  /// <returns>A task that completes after all returned invoices are deleted.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when enumeration or any deletion fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task DeleteInvoices(Guid userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoices));
      await invoiceProcessingService.DeleteInvoices(userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Adds a product line to an existing invoice through Processing.</summary>
  /// <param name="product">The product line to add.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="classificationCode">The optional GS1 GPC code to resolve canonically.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementValidationException">
  /// Thrown when the product or its manual classification code is invalid.
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
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddProduct));
      await invoiceProcessingService
        .AddProduct(invoiceIdentifier, userIdentifier, product, classificationCode, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Returns every product currently stored on an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The invoice's product collection.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyValidationException">
  /// Thrown when the invoice is unavailable to the request.
  /// </exception>
  /// <inheritdoc/>
  public async Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GetProducts));
      return await invoiceProcessingService.GetProducts(invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Returns the first product whose name contains the supplied text.</summary>
  /// <param name="productName">The case-insensitive text to find within a product name.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The first matching product, or a default product when no line matches.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyValidationException">
  /// Thrown when the invoice is unavailable to the request.
  /// </exception>
  /// <inheritdoc/>
  public async Task<Product> GetProduct(Guid invoiceIdentifier, Guid? userIdentifier, string productName, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GetProduct));
      return await invoiceProcessingService.GetProduct(invoiceIdentifier, userIdentifier, productName, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Deletes the first product matching an exact persisted name.</summary>
  /// <param name="productName">The case-insensitive exact name used to select the product.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementValidationException">
  /// Thrown when the name is blank or no exact-name product exists.
  /// </exception>
  /// <inheritdoc/>
  public async Task DeleteProduct(
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    string productName,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteProduct));
      await invoiceProcessingService.DeleteProduct(invoiceIdentifier, userIdentifier, productName, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Attaches one receipt scan to an existing invoice.</summary>
  /// <param name="scan">The scan to attach.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel attachment.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when invoice persistence cannot attach the scan.
  /// </exception>
  /// <inheritdoc/>
  public async Task AttachInvoiceScan(Guid invoiceIdentifier, Guid? userIdentifier, InvoiceScan scan, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AttachInvoiceScan));
      await invoiceProcessingService.AttachInvoiceScan(invoiceIdentifier, userIdentifier, scan, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Returns every receipt scan attached to an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The invoice's scan collection.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyValidationException">
  /// Thrown when the invoice is unavailable to the request.
  /// </exception>
  /// <inheritdoc/>
  public async Task<IEnumerable<InvoiceScan>> ReadInvoiceScans(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceScans));
      return await invoiceProcessingService.ReadInvoiceScans(invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Removes a receipt scan value from an existing invoice.</summary>
  /// <param name="scan">The scan value to remove.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when invoice persistence cannot complete the update.
  /// </exception>
  /// <inheritdoc/>
  public async Task DeleteInvoiceScan(Guid invoiceIdentifier, Guid? userIdentifier, InvoiceScan scan, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceScan));
      await invoiceProcessingService.DeleteInvoiceScan(invoiceIdentifier, userIdentifier, scan, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Adds or replaces supplied metadata entries on an invoice.</summary>
  /// <param name="metadata">The metadata entries to merge.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when invoice persistence cannot complete the update.
  /// </exception>
  /// <inheritdoc/>
  public async Task AddMetadataToInvoice(
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    IDictionary<string, object> metadata,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddMetadataToInvoice));
      await invoiceProcessingService
        .AddMetadataToInvoice(invoiceIdentifier, userIdentifier, metadata, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Upserts metadata entries and returns the complete persisted dictionary.</summary>
  /// <param name="metadata">The metadata entries to merge.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>The complete metadata dictionary from the persisted invoice.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when invoice persistence cannot complete the update.
  /// </exception>
  /// <inheritdoc/>
  public async Task<IDictionary<string, object>> UpdateMetadataOnInvoice(
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    IDictionary<string, object> metadata,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMetadataOnInvoice));
      return await invoiceProcessingService
        .UpdateMetadataOnInvoice(invoiceIdentifier, userIdentifier, metadata, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Returns the complete metadata dictionary stored on an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The invoice's persisted metadata dictionary.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyValidationException">
  /// Thrown when the invoice is unavailable to the request.
  /// </exception>
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

  /// <summary>Removes selected metadata keys from an invoice.</summary>
  /// <param name="metadataKeys">The keys to remove when present.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when invoice persistence cannot complete the update.
  /// </exception>
  /// <inheritdoc/>
  public async Task DeleteMetadataFromInvoice(
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    IEnumerable<string> metadataKeys,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMetadataFromInvoice));
      await invoiceProcessingService
        .DeleteMetadataFromInvoice(invoiceIdentifier, userIdentifier, metadataKeys, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Creates a merchant through the unified Processing boundary.</summary>
  /// <param name="merchant">The merchant entity to persist.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="classificationCode">The optional NACE 2.1 code to resolve canonically.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementValidationException">
  /// Thrown when merchant input or its manual classification code is invalid.
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
      await invoiceProcessingService
        .CreateMerchant(merchant, parentCompanyId, classificationCode, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Reads one merchant through the unified Processing boundary.</summary>
  /// <param name="identifier">The merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The matching merchant entity.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyValidationException">
  /// Thrown when the merchant is unavailable to the request.
  /// </exception>
  /// <inheritdoc/>
  public async Task<Merchant> ReadMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchant));
      return await invoiceProcessingService.ReadMerchant(identifier, parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Reads all merchants in one parent-company partition.</summary>
  /// <param name="parentCompanyId">The parent-company partition to query.</param>
  /// <param name="cancellationToken">The token used to cancel the query.</param>
  /// <returns>The merchants returned by Processing.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when merchant persistence cannot complete the query.
  /// </exception>
  /// <inheritdoc/>
  public async Task<IEnumerable<Merchant>> ReadMerchants(Guid parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchants));
      return await invoiceProcessingService.ReadMerchants(parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Reads the merchants referenced by the caller's own invoices through the unified Processing boundary.</summary>
  /// <param name="userIdentifier">The authenticated user whose invoices are inspected.</param>
  /// <param name="cancellationToken">The token used to cancel the query.</param>
  /// <returns>The distinct merchants referenced by the caller's invoices.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when invoice or merchant persistence cannot complete the query.
  /// </exception>
  /// <inheritdoc/>
  public async Task<IEnumerable<Merchant>> ReadMerchantsVisibleToUser(
    Guid userIdentifier,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantsVisibleToUser));
      return await invoiceProcessingService.ReadMerchantsVisibleToUser(userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Replaces client-editable merchant state through Processing.</summary>
  /// <param name="updatedMerchant">The replacement merchant fields.</param>
  /// <param name="identifier">The persisted merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="classificationCode">The optional NACE 2.1 code to resolve canonically.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>The persisted merchant entity.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementValidationException">
  /// Thrown when replacement input or a manual classification code is invalid.
  /// </exception>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
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
      return await invoiceProcessingService
        .UpdateMerchant(identifier, parentCompanyId, updatedMerchant, classificationCode, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Deletes one merchant through Processing.</summary>
  /// <param name="identifier">The merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after deletion.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when merchant persistence cannot complete deletion.
  /// </exception>
  /// <inheritdoc/>
  public async Task DeleteMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchant));
      await invoiceProcessingService.DeleteMerchant(identifier, parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Validates invoice ownership and queues a request with resolved analysis options.</summary>
  /// <param name="invoiceId">The invoice identifier to analyze.</param>
  /// <param name="userIdentifier">The authenticated invoice owner.</param>
  /// <param name="request">The requested analysis profile and capability overrides.</param>
  /// <param name="cancellationToken">The token used to cancel validation or publication.</param>
  /// <returns>The provider-assigned string message identifier.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementValidationException">
  /// Thrown when the analysis request is invalid.
  /// </exception>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyValidationException">
  /// Thrown when the target invoice is unavailable to the requester.
  /// </exception>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when target lookup or queue publication fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<string> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    InvoiceAnalysisRequestDto request,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(QueueInvoiceAnalysisAsync));
      return await invoiceProcessingService
        .QueueInvoiceAnalysisAsync(invoiceId, userIdentifier, request, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Validates merchant ownership and queues a request with resolved analysis options.</summary>
  /// <param name="merchantId">The merchant identifier to analyze.</param>
  /// <param name="userIdentifier">The authenticated requester.</param>
  /// <param name="request">The requested analysis profile and capability overrides.</param>
  /// <param name="cancellationToken">The token used to cancel validation or publication.</param>
  /// <returns>The provider-assigned string message identifier.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementValidationException">
  /// Thrown when the analysis request is invalid.
  /// </exception>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyValidationException">
  /// Thrown when the target merchant is unavailable or not owned by the requester.
  /// </exception>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when target lookup or queue publication fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<string> QueueMerchantAnalysisAsync(
    Guid merchantId,
    Guid userIdentifier,
    MerchantAnalysisRequestDto request,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(QueueMerchantAnalysisAsync));
      return await invoiceProcessingService
        .QueueMerchantAnalysisAsync(merchantId, userIdentifier, request, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Dequeues and processes at most one visible durable analysis message.</summary>
  /// <param name="cancellationToken">The token used to cancel dequeue or processing.</param>
  /// <returns><see langword="true"/> when a message was dequeued; otherwise, <see langword="false"/>.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when queue ownership, target access, deletion, or replacement publication fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<bool> ProcessAnalysisAsync(CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ProcessAnalysisAsync));
      return await invoiceProcessingService
        .ProcessAnalysisAsync(cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);
}
