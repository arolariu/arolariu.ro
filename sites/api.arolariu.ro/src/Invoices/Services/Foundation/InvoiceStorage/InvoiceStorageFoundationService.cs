namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using DDD = arolariu.Backend.Domain.Invoices.DDD;

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
  /// <summary>Validates and persists a new invoice through the database broker.</summary>
  /// <param name="invoice">The invoice aggregate to persist.</param>
  /// <param name="userIdentifier">The optional owning partition forwarded by upstream layers.</param>
  /// <param name="cancellationToken">The token used to cancel persistence.</param>
  /// <returns>A task that completes after the invoice is stored.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation.InvoiceFoundationValidationException">
  /// Thrown when the invoice is null or violates required invoice invariants.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation.InvoiceFoundationDependencyException">
  /// Thrown when the database broker reports a storage failure.
  /// </exception>
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
  /// <summary>Reads one invoice through the database broker.</summary>
  /// <param name="identifier">The non-empty invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning partition used for the read.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The matching invoice aggregate.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation.InvoiceFoundationValidationException">
  /// Thrown when <paramref name="identifier"/> is empty.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation.InvoiceFoundationDependencyValidationException">
  /// Thrown when the broker classifies the invoice as unavailable to this request.
  /// </exception>
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
  /// <summary>Reads all active invoices in the specified user partition.</summary>
  /// <param name="userIdentifier">The user partition to query.</param>
  /// <param name="cancellationToken">The token used to cancel the query.</param>
  /// <returns>The invoices returned by the database broker.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation.InvoiceFoundationDependencyException">
  /// Thrown when the database broker cannot complete the query.
  /// </exception>
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
  /// <summary>Validates and replaces an existing invoice through the database broker.</summary>
  /// <param name="updatedInvoice">The replacement invoice state.</param>
  /// <param name="invoiceIdentifier">The non-empty identifier of the invoice to replace.</param>
  /// <param name="userIdentifier">The optional owning partition forwarded by upstream layers.</param>
  /// <param name="cancellationToken">The token used to cancel the update.</param>
  /// <returns>The invoice state returned by the database broker.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation.InvoiceFoundationValidationException">
  /// Thrown when the identifier is empty or the replacement aggregate violates required invariants.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation.InvoiceFoundationDependencyValidationException">
  /// Thrown when the broker rejects the update because of resource state or access constraints.
  /// </exception>
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
  /// <summary>Deletes one invoice through the database broker.</summary>
  /// <param name="identifier">The non-empty invoice identifier.</param>
  /// <param name="userIdentifier">The optional owning partition used for deletion.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after the broker accepts the deletion.</returns>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation.InvoiceFoundationValidationException">
  /// Thrown when <paramref name="identifier"/> is empty.
  /// </exception>
  /// <exception cref="DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation.InvoiceFoundationDependencyValidationException">
  /// Thrown when the broker rejects the deletion because of resource state or access constraints.
  /// </exception>
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
