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
/// Coordinates invoice aggregate storage workflows.
/// </summary>
public partial class InvoiceOrchestrationService : IInvoiceOrchestrationService
{
  private readonly IInvoiceStorageFoundationService invoiceStorageFoundationService;
  private readonly ILogger<IInvoiceOrchestrationService> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceOrchestrationService"/> class.
  /// </summary>
  /// <param name="invoiceStorageFoundationService">The invoice storage foundation service.</param>
  /// <param name="loggerFactory">The logger factory used to create the orchestration logger.</param>
  public InvoiceOrchestrationService(
    IInvoiceStorageFoundationService invoiceStorageFoundationService,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(invoiceStorageFoundationService);
    ArgumentNullException.ThrowIfNull(loggerFactory);

    this.invoiceStorageFoundationService = invoiceStorageFoundationService;
    logger = loggerFactory.CreateLogger<IInvoiceOrchestrationService>();
  }

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

  /// <inheritdoc/>
  public async Task<Invoice> AttachInvoiceScanAsync(
    InvoiceScan scan,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AttachInvoiceScanAsync));

      Invoice invoice = await invoiceStorageFoundationService
        .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);

      invoice.Scans.Add(scan);

      return await invoiceStorageFoundationService
        .UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteInvoiceObject(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceObject));
      await invoiceStorageFoundationService
        .DeleteInvoiceObject(identifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllInvoiceObjects));
      return await invoiceStorageFoundationService
        .ReadAllInvoiceObjects(userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceObject));
      return await invoiceStorageFoundationService
        .ReadInvoiceObject(identifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Invoice> UpdateInvoiceObject(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceObject));
      return await invoiceStorageFoundationService
        .UpdateInvoiceObject(updatedInvoice, invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);
}
