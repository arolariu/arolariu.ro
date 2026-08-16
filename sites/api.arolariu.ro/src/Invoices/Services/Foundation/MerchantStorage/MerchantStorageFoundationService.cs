namespace arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;


/// <summary>
/// Class that implements the merchant storage foundation service.
/// </summary>
public partial class MerchantStorageFoundationService : IMerchantStorageFoundationService
{
  private readonly IInvoiceNoSqlBroker invoiceNoSqlBroker;
  private readonly ITaxonomyBroker taxonomyBroker;
  private readonly ILogger<IMerchantStorageFoundationService> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantStorageFoundationService"/> class.
  /// </summary>
  /// <param name="invoiceNoSqlBroker">The NoSQL persistence broker for merchant entities.</param>
  /// <param name="taxonomyBroker">The canonical taxonomy broker used to canonicalize classifications before persistence.</param>
  /// <param name="loggerFactory">The logger factory used to create the service logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when any required dependency is null.</exception>
  public MerchantStorageFoundationService(
    IInvoiceNoSqlBroker invoiceNoSqlBroker,
    ITaxonomyBroker taxonomyBroker,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(invoiceNoSqlBroker);
    ArgumentNullException.ThrowIfNull(taxonomyBroker);
    ArgumentNullException.ThrowIfNull(loggerFactory);
    this.invoiceNoSqlBroker = invoiceNoSqlBroker;
    this.taxonomyBroker = taxonomyBroker;
    this.logger = loggerFactory.CreateLogger<IMerchantStorageFoundationService>();
  }

  #region Create Merchant Object API
  /// <inheritdoc/>
  public async Task CreateMerchantObject(Merchant merchant, Guid? parentCompanyId, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchantObject));
    ValidateMerchantIdentifierIsSet(merchant.id);
    CanonicalizeMerchantClassification(merchant);

    await invoiceNoSqlBroker
      .CreateMerchantAsync(merchant, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Delete Merchant Object API
  /// <inheritdoc/>
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
  /// <inheritdoc/>
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

  #region Find Merchant By Normalized Name API
  /// <inheritdoc/>
  public async Task<Merchant?> FindMerchantByNormalizedNameObject(string normalizedName, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(FindMerchantByNormalizedNameObject));

    string canonicalNormalizedName = NormalizeAndValidateNormalizedName(normalizedName);

    Merchant? merchant = await invoiceNoSqlBroker
      .FindMerchantByNormalizedNameAsync(canonicalNormalizedName, cancellationToken)
      .ConfigureAwait(false);

    return merchant;
  }).ConfigureAwait(false);
  #endregion

  #region Read Merchant Object API
  /// <inheritdoc/>
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
  /// <inheritdoc/>
  public async Task<Merchant> UpdateMerchantObject(Merchant updatedMerchant, Guid merchantIdentifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantObject));
    CanonicalizeMerchantClassification(updatedMerchant);

    var currentMerchant = await invoiceNoSqlBroker.ReadMerchantAsync(merchantIdentifier, parentCompanyId, cancellationToken).ConfigureAwait(false);
    ArgumentNullException.ThrowIfNull(currentMerchant);

    var newMerchant = await invoiceNoSqlBroker
      .UpdateMerchantAsync(currentMerchant, updatedMerchant, cancellationToken)
      .ConfigureAwait(false);

    return newMerchant;
  }).ConfigureAwait(false);
  #endregion
}
