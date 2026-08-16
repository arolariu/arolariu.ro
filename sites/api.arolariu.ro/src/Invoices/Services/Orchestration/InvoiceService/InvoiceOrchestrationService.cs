namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// The invoice orchestration service interface represents the orchestration service for the invoice domain.
/// </summary>
public partial class InvoiceOrchestrationService : IInvoiceOrchestrationService
{
  private readonly IInvoiceStorageFoundationService invoiceStorageFoundationService;
  private readonly ILogger<IInvoiceOrchestrationService> logger;

  /// <summary>
  /// Constructor.
  /// </summary>
  /// <param name="invoiceStorageFoundationService">The invoice storage foundation service.</param>
  /// <param name="loggerFactory">The logger factory used to create the orchestration logger.</param>
  public InvoiceOrchestrationService(
    IInvoiceStorageFoundationService invoiceStorageFoundationService,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(invoiceStorageFoundationService);

    this.invoiceStorageFoundationService = invoiceStorageFoundationService;
    logger = loggerFactory.CreateLogger<IInvoiceOrchestrationService>();
  }


  #region Create Invoice API
  /// <inheritdoc/>
  public async Task<Invoice> CreateInvoiceObject(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceObject));
    await invoiceStorageFoundationService
      .CreateInvoiceObject(invoice, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    return invoice;
  }).ConfigureAwait(false);
  #endregion

  #region Delete Invoice API
  /// <inheritdoc/>
  public async Task DeleteInvoiceObject(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceObject));
    await invoiceStorageFoundationService
      .DeleteInvoiceObject(identifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Read Invoices API
  /// <inheritdoc/>
  public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllInvoiceObjects));
    var invoices = await invoiceStorageFoundationService
      .ReadAllInvoiceObjects(userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    return invoices;
  }).ConfigureAwait(false);
  #endregion

  #region Read Invoice API
  /// <inheritdoc/>
  public async Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceObject));
    var invoice = await invoiceStorageFoundationService
      .ReadInvoiceObject(identifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    return invoice;
  }).ConfigureAwait(false);
  #endregion

  #region Update Invoice API
  /// <inheritdoc/>
  public async Task<Invoice> UpdateInvoiceObject(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceObject));
    var updatedInvoiceObject = await invoiceStorageFoundationService
      .UpdateInvoiceObject(updatedInvoice, invoiceIdentifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    return updatedInvoiceObject;
  }).ConfigureAwait(false);
  #endregion
}
