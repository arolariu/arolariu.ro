namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Validates invoice storage inputs and classifies direct database broker failures.
/// </summary>
public partial class InvoiceStorageFoundationService : IInvoiceStorageFoundationService
{
  private readonly IDatabaseBroker invoiceNoSqlBroker;
  private readonly ILogger<IInvoiceStorageFoundationService> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceStorageFoundationService"/> class.
  /// </summary>
  /// <param name="invoiceNoSqlBroker">The durable invoice database broker.</param>
  /// <param name="loggerFactory">The logger factory used to create the foundation logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when a required dependency is <see langword="null"/>.</exception>
  public InvoiceStorageFoundationService(
    IDatabaseBroker invoiceNoSqlBroker,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(invoiceNoSqlBroker);
    ArgumentNullException.ThrowIfNull(loggerFactory);
    this.invoiceNoSqlBroker = invoiceNoSqlBroker;
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

    var newInvoice = await invoiceNoSqlBroker
      .UpdateInvoiceAsync(invoiceIdentifier, updatedInvoice, cancellationToken)
      .ConfigureAwait(false);

    return newInvoice!;
  }).ConfigureAwait(false);

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
