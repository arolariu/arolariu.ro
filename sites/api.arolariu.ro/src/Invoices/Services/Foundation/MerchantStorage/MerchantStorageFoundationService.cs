namespace arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;


/// <summary>
/// Class that implements the merchant storage foundation service.
/// </summary>
public partial class MerchantStorageFoundationService : IMerchantStorageFoundationService
{
  private readonly IInvoiceNoSqlBroker invoiceNoSqlBroker;
  private readonly ILogger<IMerchantStorageFoundationService> logger;

  /// <summary>
  /// Public constructor.
  /// </summary>
  /// <param name="invoiceNoSqlBroker"></param>
  /// <param name="loggerFactory"></param>
  public MerchantStorageFoundationService(
    IInvoiceNoSqlBroker invoiceNoSqlBroker,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(invoiceNoSqlBroker);
    this.invoiceNoSqlBroker = invoiceNoSqlBroker;
    this.logger = loggerFactory.CreateLogger<IMerchantStorageFoundationService>();
  }

  #region Create Merchant Object API
  /// <inheritdoc/>
  public async Task CreateMerchantObject(Merchant merchant, Guid? parentCompanyId = null) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchantObject));
    ValidateMerchantIdentifierIsSet(merchant.id);

    await invoiceNoSqlBroker
      .CreateMerchantAsync(merchant)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Delete Merchant Object API
  /// <inheritdoc/>
  public async Task DeleteMerchantObject(Guid identifier, Guid? parentCompanyId = null) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantObject));

    ValidateMerchantIdentifierIsSet(identifier);
    ValidateParentCompanyIdentifierIsSet(parentCompanyId);

    await invoiceNoSqlBroker.DeleteMerchantAsync(identifier).ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Read Merchant Objects API
  /// <inheritdoc/>
  public async Task<IEnumerable<Merchant>> ReadAllMerchantObjects(Guid? parentCompanyId = null) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllMerchantObjects));

    if (parentCompanyId is null)
    {
      IEnumerable<Merchant> allMerchants = await invoiceNoSqlBroker
        .ReadMerchantsAsync()
        .ConfigureAwait(false);
      return allMerchants;
    }
    else
    {
      IEnumerable<Merchant> merchants = await invoiceNoSqlBroker
        .ReadMerchantsAsync((Guid)parentCompanyId)
        .ConfigureAwait(false);
      return merchants;
    }
  }).ConfigureAwait(false);
  #endregion

  #region Read Merchant Object API
  /// <inheritdoc/>
  public async Task<Merchant> ReadMerchantObject(Guid identifier, Guid? parentCompanyId = null) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantObject));
    ValidateMerchantIdentifierIsSet(identifier);

    var merchant = await invoiceNoSqlBroker
      .ReadMerchantAsync(identifier)
      .ConfigureAwait(false);
    return merchant!;
  }).ConfigureAwait(false);
  #endregion

  #region Update Merchant Object API
  /// <inheritdoc/>
  public async Task<Merchant> UpdateMerchantObject(Merchant updatedMerchant, Guid merchantIdentifier, Guid? parentCompanyId = null) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantObject));
    var currentMerchant = await invoiceNoSqlBroker.ReadMerchantAsync(merchantIdentifier).ConfigureAwait(false);
    ArgumentNullException.ThrowIfNull(currentMerchant);

    var newMerchant = await invoiceNoSqlBroker
      .UpdateMerchantAsync(currentMerchant, updatedMerchant)
      .ConfigureAwait(false);

    return newMerchant;
  }).ConfigureAwait(false);
  #endregion
}
