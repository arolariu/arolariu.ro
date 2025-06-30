namespace arolariu.Backend.Domain.Tests.Builders;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using System;
using System.Collections.Generic;

using Xunit;

/// <summary>
/// Test data builder for Merchant entities following "The Standard" test patterns.
/// </summary>
public static class MerchantTestDataBuilder
{
	private static readonly Random Random = new();

	public static Merchant CreateRandomMerchant() =>
		new Merchant
		{
			id = Guid.NewGuid(),
			ParentCompanyId = Guid.NewGuid(),
			Name = GetRandomString(),
			Description = GetRandomString(),
			Category = MerchantCategory.ONLINE_SHOP,
			Address = GetRandomString(),
			PhoneNumber = GetRandomString(),
			IsImportant = Random.Next(0, 2) == 1,
			CreatedBy = Guid.NewGuid(),
			CreatedAt = GetRandomDateTimeOffset(),
			NumberOfUpdates = Random.Next(0, 10),
			ReferencedInvoices = new List<Guid> { Guid.NewGuid() }
		};

	public static Merchant CreateMerchantWithSpecificProperties(
		Guid? id = null,
		Guid? parentCompanyId = null,
		string? name = null)
	{
		var merchant = CreateRandomMerchant();

		// Create new instance with modified properties since id is init-only
		return new Merchant
		{
			id = id ?? merchant.id,
			ParentCompanyId = parentCompanyId ?? merchant.ParentCompanyId,
			Name = name ?? merchant.Name,
			Description = merchant.Description,
			Category = merchant.Category,
			Address = merchant.Address,
			PhoneNumber = merchant.PhoneNumber,
			IsImportant = merchant.IsImportant,
			CreatedBy = merchant.CreatedBy,
			CreatedAt = merchant.CreatedAt,
			NumberOfUpdates = merchant.NumberOfUpdates,
			ReferencedInvoices = merchant.ReferencedInvoices
		};
	}

	public static TheoryData<Merchant> GetMerchantTheoryData() =>
		new TheoryData<Merchant>
		{
			CreateRandomMerchant(),
			CreateRandomMerchant(),
			CreateRandomMerchant()
		};

	public static List<Merchant> CreateMultipleRandomMerchants(int count = 3)
	{
		var merchants = new List<Merchant>();
		for (int i = 0; i < count; i++)
		{
			merchants.Add(CreateRandomMerchant());
		}
		return merchants;
	}

	private static string GetRandomString() =>
		Guid.NewGuid().ToString()[..8];

	private static DateTimeOffset GetRandomDateTimeOffset() =>
		DateTimeOffset.Now.AddDays(-Random.Next(0, 365));
}
