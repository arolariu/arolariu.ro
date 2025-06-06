﻿namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// This interface represents the merchant orchestration service.
/// </summary>
public interface IMerchantOrchestrationService
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
	/// <returns></returns>
	public Task<Merchant> ReadMerchantObject(Guid identifier);

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
	/// Reads all merchant objects.
	/// </summary>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task<IEnumerable<Merchant>> ReadAllMerchantObjects(Guid parentCompanyId);

	/// <summary>
	/// Updates a merchant object.
	/// </summary>
	/// <param name="merchantIdentifier"></param>
	/// <param name="updatedMerchant"></param>
	/// <returns></returns>
	public Task<Merchant> UpdateMerchantObject(Guid merchantIdentifier, Merchant updatedMerchant);

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
	/// <returns></returns>
	public Task DeleteMerchantObject(Guid identifier);

	/// <summary>
	/// Deletes a merchant object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task DeleteMerchantObject(Guid identifier, Guid parentCompanyId);
}
