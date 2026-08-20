namespace arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using DDD = arolariu.Backend.Domain.Invoices.DDD;


/// <summary>
/// Validates merchant storage inputs and classifies direct database broker failures.
/// </summary>
public partial class MerchantStorageFoundationService : IMerchantStorageFoundationService
{
  private readonly IDatabaseBroker invoiceNoSqlBroker;
  private readonly ILogger<IMerchantStorageFoundationService> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantStorageFoundationService"/> class.
  /// </summary>
  /// <param name="invoiceNoSqlBroker">The NoSQL persistence broker for merchant entities.</param>
  /// <param name="loggerFactory">The logger factory used to create the service logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when any required dependency is null.</exception>
  public MerchantStorageFoundationService(
    IDatabaseBroker invoiceNoSqlBroker,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(invoiceNoSqlBroker);
    ArgumentNullException.ThrowIfNull(loggerFactory);
    this.invoiceNoSqlBroker = invoiceNoSqlBroker;
    this.logger = loggerFactory.CreateLogger<IMerchantStorageFoundationService>();
  }

  #region Create Merchant Object API
  /// <summary>Validates and persists a new merchant through the database broker.</summary>
  /// <param name="merchant">The merchant entity to persist.</param>
  /// <param name="parentCompanyId">The optional parent-company partition forwarded by upstream layers.</param>
  /// <param name="cancellationToken">The token used to cancel persistence.</param>
  /// <returns>A task that completes after the merchant is stored.</returns>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Foundation.MerchantFoundationServiceValidationException">
  /// Thrown when the merchant is null or has an empty identifier.
  /// </exception>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Foundation.MerchantFoundationServiceDependencyException">
  /// Thrown when the database broker reports a storage failure.
  /// </exception>
  public async Task CreateMerchantObject(Merchant merchant, Guid? parentCompanyId, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchantObject));
    ArgumentNullException.ThrowIfNull(merchant);
    ValidateMerchantIdentifierIsSet(merchant.id);

    await invoiceNoSqlBroker
      .CreateMerchantAsync(merchant, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Delete Merchant Object API
  /// <summary>Validates the identifiers and deletes one merchant through the database broker.</summary>
  /// <param name="identifier">The non-empty merchant identifier.</param>
  /// <param name="parentCompanyId">The required non-empty parent-company partition.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after the broker accepts the deletion.</returns>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Foundation.MerchantFoundationServiceValidationException">
  /// Thrown when either identifier is missing or empty.
  /// </exception>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Foundation.MerchantFoundationServiceDependencyValidationException">
  /// Thrown when the broker rejects the deletion because of resource state or access constraints.
  /// </exception>
  public async Task DeleteMerchantObject(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantObject));

    ValidateMerchantIdentifierIsSet(identifier);
    ValidateParentCompanyIdentifierIsSet(parentCompanyId);

    await invoiceNoSqlBroker.DeleteMerchantAsync(identifier, parentCompanyId, cancellationToken).ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Read Merchant Objects API
  /// <summary>Reads all merchants in one parent-company partition.</summary>
  /// <param name="parentCompanyId">The parent-company partition to query.</param>
  /// <param name="cancellationToken">The token used to cancel the query.</param>
  /// <returns>The merchants returned by the database broker.</returns>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Foundation.MerchantFoundationServiceDependencyException">
  /// Thrown when the database broker cannot complete the query.
  /// </exception>
  public async Task<IEnumerable<Merchant>> ReadAllMerchantObjects(Guid parentCompanyId, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllMerchantObjects));


    IEnumerable<Merchant> merchants = await invoiceNoSqlBroker
      .ReadMerchantsAsync(parentCompanyId, cancellationToken)
      .ConfigureAwait(false);
    return merchants;
  }).ConfigureAwait(false);
  #endregion

  #region Read Merchant Object API
  /// <summary>Reads one merchant through the database broker.</summary>
  /// <param name="identifier">The merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition used for the read.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The matching merchant entity.</returns>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Foundation.MerchantFoundationServiceDependencyValidationException">
  /// Thrown when the broker classifies the merchant as unavailable to this request.
  /// </exception>
  public async Task<Merchant> ReadMerchantObject(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantObject));
    var merchant = await invoiceNoSqlBroker
      .ReadMerchantAsync(identifier, parentCompanyId, cancellationToken)
      .ConfigureAwait(false);
    return merchant!;
  }).ConfigureAwait(false);
  #endregion

  #region Update Merchant Object API
  /// <summary>Applies client-editable fields to an existing merchant and persists the result.</summary>
  /// <param name="updatedMerchant">The client-supplied replacement fields.</param>
  /// <param name="merchantIdentifier">The identifier of the persisted merchant.</param>
  /// <param name="parentCompanyId">The optional parent-company partition used for lookup.</param>
  /// <param name="cancellationToken">The token used to cancel the read or update.</param>
  /// <returns>The merchant state returned by the database broker.</returns>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Foundation.MerchantFoundationServiceDependencyValidationException">
  /// Thrown when the existing merchant cannot be found.
  /// </exception>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Foundation.MerchantFoundationServiceException">
  /// Thrown when the replacement value is null or an unclassified service failure occurs.
  /// </exception>
  public async Task<Merchant> UpdateMerchantObject(Merchant updatedMerchant, Guid merchantIdentifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantObject));
    ArgumentNullException.ThrowIfNull(updatedMerchant);

    var currentMerchant = await invoiceNoSqlBroker.ReadMerchantAsync(merchantIdentifier, parentCompanyId, cancellationToken).ConfigureAwait(false);
    if (currentMerchant is null)
    {
      throw new MerchantNotFoundException(merchantIdentifier);
    }

    ApplyClientUpdate(currentMerchant, updatedMerchant);

    var newMerchant = await invoiceNoSqlBroker
      .UpdateMerchantAsync(currentMerchant, currentMerchant, cancellationToken)
      .ConfigureAwait(false);

    return newMerchant;
  }).ConfigureAwait(false);
  #endregion

  private static void ApplyClientUpdate(Merchant currentMerchant, Merchant clientUpdate)
  {
    currentMerchant.Name = clientUpdate.Name;
    currentMerchant.Description = clientUpdate.Description;
    currentMerchant.Address = clientUpdate.Address;

    if (clientUpdate.Classification is not null)
    {
      currentMerchant.Classification = clientUpdate.Classification;
    }

    if (clientUpdate.AdditionalMetadata.Count > 0)
    {
      currentMerchant.AdditionalMetadata.Clear();

      foreach ((string key, string value) in clientUpdate.AdditionalMetadata)
      {
        currentMerchant.AdditionalMetadata[key] = value;
      }
    }
  }
}
