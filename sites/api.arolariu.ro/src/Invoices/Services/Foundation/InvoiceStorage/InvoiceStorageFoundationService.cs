namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// The Invoice Storage foundation service.
/// </summary>
public partial class InvoiceStorageFoundationService : IInvoiceStorageFoundationService
{
  private readonly IDatabaseBroker invoiceNoSqlBroker;
  private readonly IBlobStorageBroker invoiceBlobStorageBroker;
  private readonly ILogger<IInvoiceStorageFoundationService> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceStorageFoundationService"/> class.
  /// </summary>
  /// <param name="invoiceNoSqlBroker">The durable invoice database broker.</param>
  /// <param name="invoiceBlobStorageBroker">The approved blob-storage broker used to inspect new scans before persistence.</param>
  /// <param name="loggerFactory">The logger factory used to create the foundation logger.</param>
  public InvoiceStorageFoundationService(
    IDatabaseBroker invoiceNoSqlBroker,
    IBlobStorageBroker invoiceBlobStorageBroker,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(invoiceNoSqlBroker);
    ArgumentNullException.ThrowIfNull(invoiceBlobStorageBroker);
    ArgumentNullException.ThrowIfNull(loggerFactory);
    this.invoiceNoSqlBroker = invoiceNoSqlBroker;
    this.invoiceBlobStorageBroker = invoiceBlobStorageBroker;
    this.logger = loggerFactory.CreateLogger<IInvoiceStorageFoundationService>();
  }

  #region Create Invoice Object API
  /// <inheritdoc/>
  public async Task CreateInvoiceObject(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceObject));
    ArgumentNullException.ThrowIfNull(invoice);
    ValidateInvoiceInformationIsValid(invoice);
    await ValidateInvoiceScansAsync(invoice.Scans, cancellationToken).ConfigureAwait(false);

    await invoiceNoSqlBroker
      .CreateInvoiceAsync(invoice, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Read Invoice Object API
  /// <inheritdoc/>
  public async Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceObject));
    ValidateIdentifierIsSet(identifier);

    var invoice = await invoiceNoSqlBroker
      .ReadInvoiceAsync(identifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    return invoice!;
  }).ConfigureAwait(false);
  #endregion

  #region Read Invoice Objects API
  /// <inheritdoc/>
  public async Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllInvoiceObjects));
    var invoices = await invoiceNoSqlBroker
      .ReadInvoicesAsync(userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    return invoices;
  }).ConfigureAwait(false);
  #endregion

  #region Update Invoice Object API
  /// <inheritdoc/>
  public async Task<Invoice> UpdateInvoiceObject(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceObject));
    ValidateIdentifierIsSet(invoiceIdentifier);
    ArgumentNullException.ThrowIfNull(updatedInvoice);
    ValidateInvoiceInformationIsValid(updatedInvoice);
    await ValidateInvoiceScansAsync(updatedInvoice.Scans, cancellationToken).ConfigureAwait(false);

    var newInvoice = await invoiceNoSqlBroker
      .UpdateInvoiceAsync(invoiceIdentifier, updatedInvoice, cancellationToken)
      .ConfigureAwait(false);

    return newInvoice!;
  }).ConfigureAwait(false);

  private async Task ValidateInvoiceScansAsync(
    IEnumerable<InvoiceScan>? scans,
    CancellationToken cancellationToken)
  {
    if (scans is null)
    {
      return;
    }

    foreach (InvoiceScan scan in scans)
    {
      cancellationToken.ThrowIfCancellationRequested();
      ValidateScanIsUsable(scan);

      if (string.IsNullOrWhiteSpace(scan.ApprovedBlobPath))
      {
        continue;
      }

      await ValidateScanBlobPropertiesAsync(scan, cancellationToken).ConfigureAwait(false);
    }
  }

  private async Task ValidateScanBlobPropertiesAsync(
    InvoiceScan scan,
    CancellationToken cancellationToken)
  {
    InvoiceScanBlobProperties properties;

    try
    {
      properties = await invoiceBlobStorageBroker
        .InspectInvoiceScanAsync(scan.Location, cancellationToken)
        .ConfigureAwait(false);
    }
    catch (Azure.RequestFailedException exception) when (exception.Status == 404)
    {
      throw new InvoiceScanBlobValidationException(
        "The uploaded scan was not found in approved storage.",
        exception);
    }
    catch (Exception exception) when (exception is Azure.RequestFailedException or HttpRequestException or TimeoutException)
    {
      throw new InvoiceScanBlobDependencyException(
        "The uploaded scan could not be inspected in storage.",
        exception);
    }

    ValidateScanProperties(scan.Type, properties);
  }
  #endregion

  #region Delete Invoice Object API
  /// <inheritdoc/>
  public async Task DeleteInvoiceObject(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceObject));
    ValidateIdentifierIsSet(identifier);

    await invoiceNoSqlBroker
      .DeleteInvoiceAsync(identifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion
}
