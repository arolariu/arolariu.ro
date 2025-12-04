namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// The invoice orchestration service interface represents the orchestration service for the invoice domain.
/// </summary>
public partial class InvoiceOrchestrationService : IInvoiceOrchestrationService
{
  private readonly IInvoiceAnalysisFoundationService invoiceAnalysisFoundationService;
  private readonly IInvoiceStorageFoundationService invoiceStorageFoundationService;
  private readonly ILogger<IInvoiceOrchestrationService> logger;

  /// <summary>
  /// Constructor.
  /// </summary>
  /// <param name="invoiceAnalysisFoundationService"></param>
  /// <param name="invoiceStorageFoundationService"></param>
  /// <param name="loggerFactory"></param>
  public InvoiceOrchestrationService(
    IInvoiceAnalysisFoundationService invoiceAnalysisFoundationService,
    IInvoiceStorageFoundationService invoiceStorageFoundationService,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(invoiceAnalysisFoundationService);
    ArgumentNullException.ThrowIfNull(invoiceStorageFoundationService);

    this.invoiceAnalysisFoundationService = invoiceAnalysisFoundationService;
    this.invoiceStorageFoundationService = invoiceStorageFoundationService;
    logger = loggerFactory.CreateLogger<IInvoiceOrchestrationService>();
  }

  #region Analyze Invoice API
  /// <inheritdoc/>
  public async Task AnalyzeInvoiceWithOptions(AnalysisOptions options, Guid invoiceIdentifier, Guid? userIdentifier = null) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoiceWithOptions));
    Invoice currentInvoice = await invoiceStorageFoundationService
      .ReadInvoiceObject(invoiceIdentifier, userIdentifier)
      .ConfigureAwait(false);

    Invoice analyzedInvoice = await invoiceAnalysisFoundationService
      .AnalyzeInvoiceAsync(options, currentInvoice)
      .ConfigureAwait(false);

    await invoiceStorageFoundationService
      .UpdateInvoiceObject(analyzedInvoice, invoiceIdentifier, userIdentifier)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Create Invoice API
  /// <inheritdoc/>
  public async Task<Invoice> CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceObject));
    await invoiceStorageFoundationService
      .CreateInvoiceObject(invoice, userIdentifier)
      .ConfigureAwait(false);
    return invoice;
  }).ConfigureAwait(false);
  #endregion

  #region Delete Invoice API
  /// <inheritdoc/>
  public async Task DeleteInvoiceObject(Guid identifier, Guid? userIdentifier = null) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceObject));
    await invoiceStorageFoundationService
      .DeleteInvoiceObject(identifier, userIdentifier)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Read Invoices API
  /// <inheritdoc/>
  public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid userIdentifier) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllInvoiceObjects));
    var invoices = await invoiceStorageFoundationService
      .ReadAllInvoiceObjects(userIdentifier)
      .ConfigureAwait(false);
    return invoices;
  }).ConfigureAwait(false);
  #endregion

  #region Read Invoice API
  /// <inheritdoc/>
  public async Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier = null) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceObject));
    var invoice = await invoiceStorageFoundationService
      .ReadInvoiceObject(identifier, userIdentifier)
      .ConfigureAwait(false);
    return invoice;
  }).ConfigureAwait(false);
  #endregion

  #region Update Invoice API
  /// <inheritdoc/>
  public async Task<Invoice> UpdateInvoiceObject(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier = null) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceObject));
    var updatedInvoiceObject = await invoiceStorageFoundationService
      .UpdateInvoiceObject(updatedInvoice, invoiceIdentifier, userIdentifier)
      .ConfigureAwait(false);
    return updatedInvoiceObject;
  }).ConfigureAwait(false);
  #endregion
}
