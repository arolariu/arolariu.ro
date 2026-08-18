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
  /// Creates a merchant object.
  /// </summary>
  /// <param name="merchant"></param>
  /// <param name="parentCompanyId"></param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns></returns>
  Task CreateMerchantObject(Merchant merchant, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Read Merchant API
  /// <summary>
  /// Reads a merchant object.
  /// </summary>
  /// <param name="identifier"></param>
  /// <param name="parentCompanyId"></param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns></returns>
  Task<Merchant> ReadMerchantObject(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Read Merchants API
  /// <summary>
  /// Reads all merchant objects.
  /// </summary>
  /// <param name="parentCompanyId"></param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns></returns>
  Task<IEnumerable<Merchant>> ReadAllMerchantObjects(Guid parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Find Merchant By Normalized Name API
  /// <summary>
  /// Resolves a merchant by exact normalized name.
  /// </summary>
  /// <remarks>
  /// <para><b>Validation:</b> Delegates to the merchant foundation layer, which canonicalizes the supplied merchant name and rejects values that normalize
  /// to an empty representation.</para>
  /// <para><b>Dependency Behavior:</b> Persistence and query failures are surfaced as orchestration dependency or dependency-validation exceptions after
  /// the foundation layer classifies broker faults.</para>
  /// <para><b>Cancellation:</b> Cancellation is not wrapped; an <see cref="OperationCanceledException"/> flows through unchanged so callers can honor
  /// request abort semantics.</para>
  /// </remarks>
  /// <param name="normalizedName">The normalized merchant name to resolve.</param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns>The matching merchant or null when no exact normalized match exists.</returns>
  /// <exception cref="MerchantOrchestrationServiceValidationException">Thrown when the supplied merchant name resolves to an empty canonical value.</exception>
  /// <exception cref="MerchantOrchestrationServiceDependencyValidationException">Thrown when dependency validation failures occur during merchant lookup.</exception>
  /// <exception cref="MerchantOrchestrationServiceDependencyException">Thrown when dependency failures occur during merchant lookup.</exception>
  /// <exception cref="MerchantOrchestrationServiceException">Thrown when an unexpected orchestration failure occurs.</exception>
  /// <exception cref="OperationCanceledException">Thrown if the operation is cancelled.</exception>
  Task<Merchant?> FindMerchantByNormalizedNameObject(string normalizedName, CancellationToken cancellationToken);
  #endregion

  #region Update Merchant API
  /// <summary>
  /// Updates a merchant object.
  /// </summary>
  /// <param name="updatedMerchant"></param>
  /// <param name="merchantIdentifier"></param>
  /// <param name="parentCompanyId"></param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns></returns>
  Task<Merchant> UpdateMerchantObject(Merchant updatedMerchant, Guid merchantIdentifier, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion

  #region Delete Merchant API
  /// <summary>
  /// Deletes a merchant object.
  /// </summary>
  /// <param name="identifier"></param>
  /// <param name="parentCompanyId"></param>
  /// <param name="cancellationToken">Cancellation token to abort the operation (required).</param>
  /// <returns></returns>
  Task DeleteMerchantObject(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken);
  #endregion
}
