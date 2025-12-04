namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

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
  /// <returns></returns>
  Task CreateMerchantObject(Merchant merchant, Guid? parentCompanyId = null);
  #endregion

  #region Read Merchant API
  /// <summary>
  /// Reads a merchant object.
  /// </summary>
  /// <param name="identifier"></param>
  /// <param name="parentCompanyId"></param>
  /// <returns></returns>
  Task<Merchant> ReadMerchantObject(Guid identifier, Guid? parentCompanyId = null);
  #endregion

  #region Read Merchants API
  /// <summary>
  /// Reads all merchant objects.
  /// </summary>
  /// <param name="parentCompanyId"></param>
  /// <returns></returns>
  Task<IEnumerable<Merchant>> ReadAllMerchantObjects(Guid parentCompanyId);
  #endregion

  #region Update Merchant API
  /// <summary>
  /// Updates a merchant object.
  /// </summary>
  /// <param name="updatedMerchant"></param>
  /// <param name="merchantIdentifier"></param>
  /// <param name="parentCompanyId"></param>
  /// <returns></returns>
  Task<Merchant> UpdateMerchantObject(Merchant updatedMerchant, Guid merchantIdentifier, Guid? parentCompanyId = null);
  #endregion

  #region Delete Merchant API
  /// <summary>
  /// Deletes a merchant object.
  /// </summary>
  /// <param name="identifier"></param>
  /// <param name="parentCompanyId"></param>
  /// <returns></returns>
  Task DeleteMerchantObject(Guid identifier, Guid? parentCompanyId = null);
  #endregion
}
