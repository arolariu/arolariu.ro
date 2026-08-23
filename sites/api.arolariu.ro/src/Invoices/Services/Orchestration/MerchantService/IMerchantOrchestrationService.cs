namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;

/// <summary>
/// This interface represents the merchant orchestration service.
/// </summary>
public interface IMerchantOrchestrationService
{
  #region Create Merchant API
  /// <summary>
  /// Persists a merchant through the merchant storage foundation.
  /// </summary>
  /// <param name="merchant">The merchant entity to persist.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>A task that completes after persistence.</returns>
  Task CreateMerchantObject(Merchant merchant, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Read Merchant API
  /// <summary>
  /// Reads one merchant through the merchant storage foundation.
  /// </summary>
  /// <param name="identifier">The merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>The matching merchant entity.</returns>
  Task<Merchant> ReadMerchantObject(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Read Merchants API
  /// <summary>
  /// Reads all merchants in one parent-company partition.
  /// </summary>
  /// <param name="parentCompanyId">The parent-company partition to query.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>The merchants returned by storage.</returns>
  Task<IEnumerable<Merchant>> ReadAllMerchantObjects(Guid parentCompanyId, CancellationToken cancellationToken);

  /// <summary>Reads every merchant whose identifier appears in the supplied set.</summary>
  /// <param name="merchantIdentifiers">The merchant identifiers to read. May be empty.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>The merchants matching the supplied identifiers.</returns>
  Task<IEnumerable<Merchant>> ReadMerchantObjectsByIdentifiers(IReadOnlyCollection<Guid> merchantIdentifiers, CancellationToken cancellationToken);
  #endregion

  #region Update Merchant API
  /// <summary>
  /// Replaces client-editable state on an existing merchant.
  /// </summary>
  /// <param name="updatedMerchant">The client-supplied replacement fields.</param>
  /// <param name="merchantIdentifier">The persisted merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>The persisted merchant entity.</returns>
  Task<Merchant> UpdateMerchantObject(Merchant updatedMerchant, Guid merchantIdentifier, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Delete Merchant API
  /// <summary>
  /// Deletes one merchant through the merchant storage foundation.
  /// </summary>
  /// <param name="identifier">The merchant identifier.</param>
  /// <param name="parentCompanyId">The optional parent-company partition.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>A task that completes after deletion.</returns>
  Task DeleteMerchantObject(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion
}
