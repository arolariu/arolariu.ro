namespace arolariu.Backend.Domain.Tests.Builders;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using Xunit;

/// <summary>
/// Test data builder for <see cref="Merchant"/> aggregates used across domain test cases.
/// Non-cryptographic randomness is intentionally used only for generating diverse test inputs.
/// </summary>
[SuppressMessage("Security", "CA5394", Justification = "Random used for non-security test data generation.")]
[SuppressMessage("Design", "CA1002", Justification = "List<T> is acceptable for internal test data manipulation.")]
public static class MerchantTestDataBuilder
{
  private static readonly Random Random = new();

  /// <summary>Creates a merchant with randomized values for test scenarios.</summary>
  public static Merchant CreateRandomMerchant() => new Merchant
  {
    id = Guid.NewGuid(),
    ParentCompanyId = Guid.NewGuid(),
    Name = GetRandomString(),
    Description = GetRandomString(),
    Category = MerchantCategory.ONLINE_SHOP,
    Address = new ContactInformation(),
    IsImportant = Random.Next(0, 2) == 1,
    CreatedBy = Guid.NewGuid(),
    CreatedAt = GetRandomDateTimeOffset(),
    NumberOfUpdates = Random.Next(0, 10),
    ReferencedInvoices = [Guid.NewGuid()]
  };

  /// <summary>Creates a merchant overriding selected properties while randomizing the rest.</summary>
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
      IsImportant = merchant.IsImportant,
      CreatedBy = merchant.CreatedBy,
      CreatedAt = merchant.CreatedAt,
      NumberOfUpdates = merchant.NumberOfUpdates,
      ReferencedInvoices = merchant.ReferencedInvoices
    };
  }

  /// <summary>Provides theory data containing several randomized merchants.</summary>
  public static TheoryData<Merchant> GetMerchantTheoryData() => [
      CreateRandomMerchant(),
      CreateRandomMerchant(),
      CreateRandomMerchant()
    ];

  /// <summary>Creates multiple randomly generated merchants.</summary>
  public static List<Merchant> CreateMultipleRandomMerchants(int count = 3)
  {
    var merchants = new List<Merchant>();
    for (int i = 0; i < count; i++)
    {
      merchants.Add(CreateRandomMerchant());
    }
    return merchants;
  }

  private static string GetRandomString() => Guid.NewGuid().ToString()[..8];

  private static DateTimeOffset GetRandomDateTimeOffset() => DateTimeOffset.Now.AddDays(-Random.Next(0, 365));
}
