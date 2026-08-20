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
  public async Task<Invoice> UpdateInvoice(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoice));
      return await invoiceProcessingService
        .UpdateInvoice(updatedInvoice, invoiceIdentifier, userIdentifier, cancellationToken)
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
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementValidationException">
  /// Thrown when the product or its manual classification code is invalid.
  /// </exception>
  public async Task AddProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddProduct));
      await invoiceProcessingService.AddProduct(product, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Updates the first product matching an exact persisted name.</summary>
  /// <param name="productName">The case-insensitive exact name used to select the first product.</param>
  /// <param name="updatedProduct">The client-editable replacement values.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>The merged product persisted on the invoice.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementValidationException">
  /// Thrown when required input is absent, no exact-name product exists, or a classification code is invalid.
  /// </exception>
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

  /// <summary>Returns every product currently stored on an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The invoice's product collection.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyValidationException">
  /// Thrown when the invoice is unavailable to the request.
  /// </exception>
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
  public async Task<Product> GetProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GetProduct));
      return await invoiceProcessingService.GetProduct(productName, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
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

  /// <summary>Attaches one receipt scan to an existing invoice.</summary>
  /// <param name="scan">The scan to attach.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel attachment.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when invoice persistence cannot attach the scan.
  /// </exception>
  public async Task CreateInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceScan));
      await invoiceProcessingService.CreateInvoiceScan(scan, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Returns every receipt scan attached to an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The invoice's scan collection.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyValidationException">
  /// Thrown when the invoice is unavailable to the request.
  /// </exception>
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
  public async Task DeleteInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceScan));
      await invoiceProcessingService.DeleteInvoiceScan(scan, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
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

  /// <summary>Upserts metadata entries and returns the complete persisted dictionary.</summary>
  /// <param name="metadata">The metadata entries to merge.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>The complete metadata dictionary from the persisted invoice.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when invoice persistence cannot complete the update.
  /// </exception>
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

  /// <summary>Returns the complete metadata dictionary stored on an invoice.</summary>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The invoice's persisted metadata dictionary.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyValidationException">
  /// Thrown when the invoice is unavailable to the request.
  /// </exception>
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

  /// <summary>Creates a merchant through the unified Processing boundary.</summary>
  /// <param name="merchant">The merchant entity to persist.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementValidationException">
  /// Thrown when merchant input or its manual classification code is invalid.
  /// </exception>
  public async Task CreateMerchant(Merchant merchant, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchant));
      await invoiceProcessingService.CreateMerchant(merchant, parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Reads one merchant through the unified Processing boundary.</summary>
  /// <param name="identifier">The merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The matching merchant entity.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyValidationException">
  /// Thrown when the merchant is unavailable to the request.
  /// </exception>
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
  public async Task<IEnumerable<Merchant>> ReadMerchants(Guid parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchants));
      return await invoiceProcessingService.ReadMerchants(parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Replaces client-editable merchant state through Processing.</summary>
  /// <param name="updatedMerchant">The replacement merchant fields.</param>
  /// <param name="identifier">The persisted merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>The persisted merchant entity.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementValidationException">
  /// Thrown when replacement input or a manual classification code is invalid.
  /// </exception>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when classification or merchant persistence fails.
  /// </exception>
  public async Task<Merchant> UpdateMerchant(Merchant updatedMerchant, Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchant));
      return await invoiceProcessingService.UpdateMerchant(updatedMerchant, identifier, parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Deletes one merchant through Processing.</summary>
  /// <param name="identifier">The merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after deletion.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when merchant persistence cannot complete deletion.
  /// </exception>
  public async Task DeleteMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchant));
      await invoiceProcessingService.DeleteMerchant(identifier, parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Applies and persists an immutable invoice analysis execution result.</summary>
  /// <param name="executionResult">The invoice result containing the durable message and target patch.</param>
  /// <param name="cancellationToken">The token used to cancel target lookup or persistence.</param>
  /// <returns>The execution result after persistence completes.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementValidationException">
  /// Thrown when the execution result is invalid.
  /// </exception>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when target lookup or persistence fails.
  /// </exception>
  public async Task<InvoiceAnalysisExecutionResult> PersistInvoiceAnalysisAsync(
    InvoiceAnalysisExecutionResult executionResult,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PersistInvoiceAnalysisAsync));
      return await invoiceProcessingService.PersistInvoiceAnalysisAsync(executionResult, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Applies and persists an immutable merchant analysis execution result.</summary>
  /// <param name="executionResult">The merchant result containing the durable message and target patch.</param>
  /// <param name="cancellationToken">The token used to cancel target lookup or persistence.</param>
  /// <returns>The execution result after persistence completes.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementValidationException">
  /// Thrown when the execution result is invalid.
  /// </exception>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when target lookup or persistence fails.
  /// </exception>
  public async Task<MerchantAnalysisExecutionResult> PersistMerchantAnalysisAsync(
    MerchantAnalysisExecutionResult executionResult,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PersistMerchantAnalysisAsync));
      return await invoiceProcessingService.PersistMerchantAnalysisAsync(executionResult, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Ensures the backend-owned durable analysis queue is available.</summary>
  /// <param name="cancellationToken">The token used to cancel provisioning.</param>
  /// <returns>A task that completes after queue availability is verified.</returns>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management.InvoiceManagementDependencyException">
  /// Thrown when queue provisioning or verification fails.
  /// </exception>
  public async Task EnsureAnalysisQueueAsync(CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureAnalysisQueueAsync));
      await invoiceProcessingService.EnsureAnalysisQueueAsync(cancellationToken).ConfigureAwait(false);
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
  /// Thrown when queue ownership, target access, persistence, or terminal deletion fails.
  /// </exception>
  public async Task<bool> TryExecuteNextAnalysisAsync(CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(TryExecuteNextAnalysisAsync));
      return await invoiceProcessingService
        .TryExecuteNextAnalysisAsync(cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);
}
