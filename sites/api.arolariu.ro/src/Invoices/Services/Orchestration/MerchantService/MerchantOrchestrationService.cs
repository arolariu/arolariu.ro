namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// This class represents the merchant orchestration service.
/// </summary>
public partial class MerchantOrchestrationService : IMerchantOrchestrationService
{
	/// <inheritdoc/>
	public Task<Merchant> CreateMerchantObject(Merchant merchant)
	{
		throw new NotImplementedException();
	}

	/// <inheritdoc/>
	public Task DeleteMerchantObject(Guid identifier, Guid parentCompanyId)
	{
		throw new NotImplementedException();
	}

	/// <inheritdoc/>
	public Task<IEnumerable<Merchant>> ReadAllMerchantObjects()
	{
		throw new NotImplementedException();
	}

	/// <inheritdoc/>
	public Task<Merchant> ReadMerchantObject(Guid identifier, Guid userIdentifier)
	{
		throw new NotImplementedException();
	}

	/// <inheritdoc/>
	public Task<Merchant> UpdateMerchantObject(Merchant currentMerchant, Merchant updatedMerchant)
	{
		throw new NotImplementedException();
	}
}
