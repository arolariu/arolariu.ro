namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using DDD = arolariu.Backend.Domain.Invoices.DDD;

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
  /// <exception cref="ArgumentNullException">Thrown when a required dependency is <see langword="null"/>.</exception>
  public InvoiceOrchestrationService(
    IInvoiceStorageFoundationService invoiceStorageFoundationService,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(invoiceStorageFoundationService);
    ArgumentNullException.ThrowIfNull(loggerFactory);

    this.invoiceStorageFoundationService = invoiceStorageFoundationService;
    logger = loggerFactory.CreateLogger<IInvoiceOrchestrationService>();
  }

  /// <summary>Persists a new invoice through the invoice storage foundation.</summary>
  /// <param name="invoice">The invoice aggregate to persist.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel persistence.</param>
  /// <returns>The supplied invoice after persistence completes.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration.InvoiceOrchestrationValidationException">
  /// Thrown when the foundation rejects invoice input.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration.InvoiceOrchestrationDependencyException">
  /// Thrown when invoice storage fails.
  /// </exception>
  public async Task<Invoice> CreateInvoiceObject(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceObject));

      await invoiceStorageFoundationService
        .CreateInvoiceObject(invoice, userIdentifier, cancellationToken)
        .ConfigureAwait(false);

      return invoice;
    }).ConfigureAwait(false);

  /// <summary>Loads an invoice, appends one scan, and persists the aggregate once.</summary>
  /// <param name="scan">The scan to append.</param>
  /// <param name="invoiceIdentifier">The target invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read or update.</param>
  /// <returns>The persisted invoice containing the appended scan.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration.InvoiceOrchestrationDependencyValidationException">
  /// Thrown when the target invoice is unavailable or the storage dependency rejects the update.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration.InvoiceOrchestrationDependencyException">
  /// Thrown when invoice storage fails.
  /// </exception>
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

  /// <summary>Deletes one invoice through the invoice storage foundation.</summary>
  /// <param name="identifier">The invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after deletion.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration.InvoiceOrchestrationValidationException">
  /// Thrown when the identifier is invalid.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration.InvoiceOrchestrationDependencyException">
  /// Thrown when invoice storage fails.
  /// </exception>
  public async Task DeleteInvoiceObject(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceObject));
      await invoiceStorageFoundationService
        .DeleteInvoiceObject(identifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Reads all invoices in one user partition through the storage foundation.</summary>
  /// <param name="userIdentifier">The user partition to query.</param>
  /// <param name="cancellationToken">The token used to cancel the query.</param>
  /// <returns>The invoices returned by the storage foundation.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration.InvoiceOrchestrationDependencyException">
  /// Thrown when invoice storage cannot complete the query.
  /// </exception>
  public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllInvoiceObjects));
      return await invoiceStorageFoundationService
        .ReadAllInvoiceObjects(userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Reads one invoice through the invoice storage foundation.</summary>
  /// <param name="identifier">The invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The matching invoice aggregate.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration.InvoiceOrchestrationDependencyValidationException">
  /// Thrown when the target invoice is unavailable to the request.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration.InvoiceOrchestrationDependencyException">
  /// Thrown when invoice storage fails.
  /// </exception>
  public async Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceObject));
      return await invoiceStorageFoundationService
        .ReadInvoiceObject(identifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Replaces one invoice through the invoice storage foundation.</summary>
  /// <param name="updatedInvoice">The replacement invoice state.</param>
  /// <param name="invoiceIdentifier">The identifier of the persisted invoice.</param>
  /// <param name="userIdentifier">The optional owning user partition.</param>
  /// <param name="cancellationToken">The token used to cancel the update.</param>
  /// <returns>The persisted invoice returned by the storage foundation.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration.InvoiceOrchestrationValidationException">
  /// Thrown when the replacement state is invalid.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration.InvoiceOrchestrationDependencyException">
  /// Thrown when invoice storage fails.
  /// </exception>
  public async Task<Invoice> UpdateInvoiceObject(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceObject));
      return await invoiceStorageFoundationService
        .UpdateInvoiceObject(updatedInvoice, invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);
}
