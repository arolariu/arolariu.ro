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
  private readonly IInvoiceScanStorageFoundationService invoiceScanStorageFoundationService;
  private readonly IInvoiceStorageFoundationService invoiceStorageFoundationService;
  private readonly ILogger<IInvoiceOrchestrationService> logger;

  /// <summary>
  /// Constructor.
  /// </summary>
  /// <param name="invoiceStorageFoundationService">The invoice storage foundation service.</param>
  /// <param name="invoiceScanStorageFoundationService">
  /// The foundation service that validates trusted storage properties before scan persistence.
  /// </param>
  /// <param name="loggerFactory">The logger factory used to create the orchestration logger.</param>
  public InvoiceOrchestrationService(
    IInvoiceStorageFoundationService invoiceStorageFoundationService,
    IInvoiceScanStorageFoundationService invoiceScanStorageFoundationService,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(invoiceStorageFoundationService);
    ArgumentNullException.ThrowIfNull(invoiceScanStorageFoundationService);

    this.invoiceStorageFoundationService = invoiceStorageFoundationService;
    this.invoiceScanStorageFoundationService = invoiceScanStorageFoundationService;
    logger = loggerFactory.CreateLogger<IInvoiceOrchestrationService>();
  }

  /// <summary>
  /// Initializes a test-only orchestration instance for non-storage workflow unit tests.
  /// </summary>
  /// <remarks>
  /// This internal constructor is available only to the Invoices test assembly. Application composition must provide
  /// the trusted scan-storage foundation through the public constructor.
  /// </remarks>
  /// <param name="invoiceStorageFoundationService">The mocked invoice storage foundation.</param>
  /// <param name="loggerFactory">The logger factory used by the unit test.</param>
  internal InvoiceOrchestrationService(
    IInvoiceStorageFoundationService invoiceStorageFoundationService,
    ILoggerFactory loggerFactory)
    : this(
      invoiceStorageFoundationService,
      new DeterministicTestInvoiceScanStorageFoundationService(),
      loggerFactory)
  {
  }


  #region Create Invoice API
  /// <inheritdoc/>
  public async Task<Invoice> CreateInvoiceObject(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceObject));
    await invoiceScanStorageFoundationService
      .ValidateInvoiceScansAsync(invoice.Scans, cancellationToken)
      .ConfigureAwait(false);

    await invoiceStorageFoundationService
      .CreateInvoiceObject(invoice, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    return invoice;
  }).ConfigureAwait(false);
  #endregion

  #region Attach Invoice Scan API
  /// <inheritdoc/>
  public async Task<Invoice> AttachInvoiceScanAsync(
    InvoiceScan scan,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AttachInvoiceScanAsync));

      await invoiceScanStorageFoundationService
        .ValidateInvoiceScanAsync(scan, cancellationToken)
        .ConfigureAwait(false);

      Invoice invoice = await invoiceStorageFoundationService
        .ReadInvoiceObject(invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
      invoice.Scans.Add(scan);

      return await invoiceStorageFoundationService
        .UpdateInvoiceObject(invoice, invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
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

  private sealed class DeterministicTestInvoiceScanStorageFoundationService
    : IInvoiceScanStorageFoundationService
  {
    public Task ValidateInvoiceScanAsync(InvoiceScan scan, CancellationToken cancellationToken) =>
      Task.CompletedTask;

    public Task ValidateInvoiceScansAsync(
      IEnumerable<InvoiceScan> scans,
      CancellationToken cancellationToken) =>
      Task.CompletedTask;
  }
}
