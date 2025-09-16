namespace arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Contract for the merchant storage foundation service.
/// </summary>
public interface IMerchantStorageFoundationService
{
	#region Create Merchant Object API
	/// <summary>
	/// Creates a merchant object.
	/// </summary>
	/// <param name="merchant"></param>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task CreateMerchantObject(Merchant merchant, Guid? parentCompanyId = null);
	#endregion

	#region Read Merchant Object API
	/// <summary>
	/// Reads a merchant object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task<Merchant> ReadMerchantObject(Guid identifier, Guid? parentCompanyId = null);
	#endregion

	#region Read Merchant Objects API
	/// <summary>
	/// Reads all merchant objects.
	/// </summary>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task<IEnumerable<Merchant>> ReadAllMerchantObjects(Guid? parentCompanyId = null);
	#endregion

	#region Update Merchant Object API
	/// <summary>
	/// Updates a merchant object.
	/// </summary>
	/// <param name="merchantIdentifier"></param>
	/// <param name="parentCompanyId"></param>
	/// <param name="updatedMerchant"></param>
	/// <returns></returns>
	public Task<Merchant> UpdateMerchantObject(Merchant updatedMerchant, Guid merchantIdentifier, Guid? parentCompanyId = null);
	#endregion

	#region Delete Merchant Object API
	/// <summary>
	/// Deletes a merchant object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task DeleteMerchantObject(Guid identifier, Guid? parentCompanyId = null);
	#endregion
}
