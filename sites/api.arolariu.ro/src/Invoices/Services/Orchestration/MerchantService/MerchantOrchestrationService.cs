namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using DDD = arolariu.Backend.Domain.Invoices.DDD;


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
  /// <summary>Persists a merchant through the merchant storage foundation.</summary>
  /// <param name="merchant">The merchant entity to persist.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">The token used to cancel persistence.</param>
  /// <returns>A task that completes after persistence.</returns>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Orchestration.MerchantOrchestrationServiceValidationException">
  /// Thrown when the foundation rejects merchant input.
  /// </exception>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Orchestration.MerchantOrchestrationServiceDependencyException">
  /// Thrown when merchant storage fails.
  /// </exception>
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
  /// <summary>Deletes one merchant through the merchant storage foundation.</summary>
  /// <param name="identifier">The merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after deletion.</returns>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Orchestration.MerchantOrchestrationServiceValidationException">
  /// Thrown when an identifier is invalid.
  /// </exception>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Orchestration.MerchantOrchestrationServiceDependencyException">
  /// Thrown when merchant storage fails.
  /// </exception>
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
  /// <summary>Reads all merchants in one parent-company partition.</summary>
  /// <param name="parentCompanyId">The parent-company partition to query.</param>
  /// <param name="cancellationToken">The token used to cancel the query.</param>
  /// <returns>The merchants returned by the storage foundation.</returns>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Orchestration.MerchantOrchestrationServiceDependencyException">
  /// Thrown when merchant storage cannot complete the query.
  /// </exception>
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
  /// <summary>Reads one merchant through the merchant storage foundation.</summary>
  /// <param name="identifier">The merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">The token used to cancel the read.</param>
  /// <returns>The matching merchant entity.</returns>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Orchestration.MerchantOrchestrationServiceDependencyValidationException">
  /// Thrown when the target merchant is unavailable to the request.
  /// </exception>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Orchestration.MerchantOrchestrationServiceDependencyException">
  /// Thrown when merchant storage fails.
  /// </exception>
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
  /// <summary>Replaces client-editable state on an existing merchant.</summary>
  /// <param name="updatedMerchant">The client-supplied replacement fields.</param>
  /// <param name="merchantIdentifier">The persisted merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">The token used to cancel the update.</param>
  /// <returns>The persisted merchant entity.</returns>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Orchestration.MerchantOrchestrationServiceDependencyValidationException">
  /// Thrown when the target merchant is unavailable or storage rejects the update.
  /// </exception>
  /// <exception cref="DDD.Entities.Merchants.Exceptions.Outer.Orchestration.MerchantOrchestrationServiceDependencyException">
  /// Thrown when merchant storage fails.
  /// </exception>
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
