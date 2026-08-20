namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;


/// <summary>
/// Delegates merchant persistence workflows to the merchant storage Foundation.
/// </summary>
public partial class MerchantOrchestrationService : IMerchantOrchestrationService
{
  private readonly IMerchantStorageFoundationService merchantStorage;
  private readonly ILogger<IMerchantOrchestrationService> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantOrchestrationService"/> class.
  /// </summary>
  /// <param name="merchantStorage">The merchant storage foundation boundary.</param>
  /// <param name="loggerFactory">The factory used to create the orchestration logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="merchantStorage"/> is <see langword="null"/>.</exception>
  public MerchantOrchestrationService(
    IMerchantStorageFoundationService merchantStorage,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(merchantStorage);
    this.merchantStorage = merchantStorage;
    this.logger = loggerFactory.CreateLogger<IMerchantOrchestrationService>();
  }

  #region Create Merchant API
  /// <inheritdoc/>
  public async Task CreateMerchantObject(Merchant merchant, Guid? parentCompanyId, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchantObject));
    await merchantStorage
      .CreateMerchantObject(merchant, parentCompanyId, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Delete Merchant API
  /// <inheritdoc/>
  public async Task DeleteMerchantObject(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantObject));
    await merchantStorage
      .DeleteMerchantObject(identifier, parentCompanyId, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);
  #endregion

  #region Read Merchants API
  /// <inheritdoc/>
  public async Task<IEnumerable<Merchant>> ReadAllMerchantObjects(Guid parentCompanyId, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadAllMerchantObjects));
    var merchants = await merchantStorage
      .ReadAllMerchantObjects(parentCompanyId, cancellationToken)
      .ConfigureAwait(false);
    return merchants;
  }).ConfigureAwait(false);
  #endregion

  #region Read Merchant API
  /// <inheritdoc/>
  public async Task<Merchant> ReadMerchantObject(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchantObject));
    var merchant = await merchantStorage
      .ReadMerchantObject(identifier, parentCompanyId, cancellationToken)
      .ConfigureAwait(false);
    return merchant;
  }).ConfigureAwait(false);
  #endregion

  #region Update Merchant API
  /// <inheritdoc/>
  public async Task<Merchant> UpdateMerchantObject(Merchant updatedMerchant, Guid merchantIdentifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantObject));
    var newMerchant = await merchantStorage
      .UpdateMerchantObject(updatedMerchant, merchantIdentifier, parentCompanyId, cancellationToken)
      .ConfigureAwait(false);
    return newMerchant;
  }).ConfigureAwait(false);
  #endregion
}
