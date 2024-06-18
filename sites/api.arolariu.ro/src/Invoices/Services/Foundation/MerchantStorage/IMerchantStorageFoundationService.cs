namespace arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

/// <summary>
/// Contract for the merchant storage foundation service.
/// </summary>
public interface IMerchantStorageFoundationService
{
	/// <summary>
	/// Creates a merchant object.
	/// </summary>
	/// <param name="merchant"></param>
	/// <returns></returns>
	public Task<Merchant> CreateMerchantObject(Merchant merchant);

	/// <summary>
	/// Reads a merchant object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task<Merchant> ReadMerchantObject(Guid identifier, Guid parentCompanyId);

	/// <summary>
	/// Reads all merchant objects.
	/// </summary>
	/// <returns></returns>
	public Task<IEnumerable<Merchant>> ReadAllMerchantObjects();

	/// <summary>
	/// Updates a merchant object.
	/// </summary>
	/// <param name="currentMerchant"></param>
	/// <param name="updatedMerchant"></param>
	/// <returns></returns>
	public Task<Merchant> UpdateMerchantObject(Merchant currentMerchant, Merchant updatedMerchant);

	/// <summary>
	/// Deletes a merchant object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task DeleteMerchantObject(Guid identifier, Guid parentCompanyId);
}
