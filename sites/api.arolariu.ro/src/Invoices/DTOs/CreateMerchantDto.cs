namespace arolariu.Backend.Domain.Invoices.DTOs;
using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// The CreateMerchant DTO class represents the merchant data transfer object.
/// </summary>
/// <param name="Name"></param>
/// <param name="Description"></param>
/// <param name="Address"></param>
/// <param name="ParentCompanyIdentifier"></param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct CreateMerchantDto(
	[Required] string Name,
	[Required] string Description,
	[Required] string Address,
	Guid ParentCompanyIdentifier)
{
	/// <summary>
	/// Method used to convert the DTO to a merchant.
	/// </summary>
	/// <returns></returns>
	public Merchant ToMerchant()
	{
		var merchant = new Merchant()
		{
			Id = Guid.NewGuid(),
			Address = Address,
			Category = MerchantCategory.OTHER,
			CreatedAt = DateTime.Now,
			Description = Description,
			Name = Name,
			ParentCompanyId = ParentCompanyIdentifier,
		};

		return merchant;
	}
}
