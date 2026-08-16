namespace arolariu.Backend.Domain.Tests.Invoices.Services;

using System;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies deterministic merchant resolution across broker, foundation, and orchestration layers.
/// </summary>
[TestClass]
public sealed class MerchantResolutionTests
{
  /// <summary>
  /// Verifies diacritic-insensitive and case-insensitive matching returns the stored merchant.
  /// </summary>
  [TestMethod]
  public async Task FindMerchantByNormalizedNameObject_DiacriticAndCaseDifference_ReturnsMatch()
  {
    using MerchantResolutionHarness harness = MerchantResolutionHarness.WithStoredMerchant(
      "Mega Image Ștefan cel Mare");

    Merchant? result = await harness
      .FindAsync("mega image stefan cel mare")
      .ConfigureAwait(false);

    Assert.IsNotNull(result);
    Assert.AreEqual("Mega Image Ștefan cel Mare", result.Name);
  }

  /// <summary>
  /// Verifies whitespace differences are normalized before matching.
  /// </summary>
  [TestMethod]
  public async Task FindMerchantByNormalizedNameObject_WhitespaceDifference_ReturnsMatch()
  {
    using MerchantResolutionHarness harness = MerchantResolutionHarness.WithStoredMerchant(
      "  Mega   Image   Ștefan   cel   Mare  ");

    Merchant? result = await harness
      .FindAsync("mega image stefan cel mare")
      .ConfigureAwait(false);

    Assert.IsNotNull(result);
    Assert.AreEqual("  Mega   Image   Ștefan   cel   Mare  ", result.Name);
  }

  /// <summary>
  /// Verifies soft-deleted merchants are excluded from deterministic resolution.
  /// </summary>
  [TestMethod]
  public async Task FindMerchantByNormalizedNameObject_SoftDeletedMatch_ReturnsNull()
  {
    using MerchantResolutionHarness harness = MerchantResolutionHarness.WithStoredMerchant(
      "Mega Image Ștefan cel Mare",
      isSoftDeleted: true);

    Merchant? result = await harness
      .FindAsync("mega image stefan cel mare")
      .ConfigureAwait(false);

    Assert.IsNull(result);
  }

  /// <summary>
  /// Verifies duplicate normalized matches resolve deterministically to the lowest identifier.
  /// </summary>
  [TestMethod]
  public async Task FindMerchantByNormalizedNameObject_DuplicateMatches_ReturnsLowestIdentifier()
  {
    Merchant firstMerchant = new()
    {
      id = Guid.Parse("10000000-0000-0000-0000-000000000000"),
      ParentCompanyId = Guid.NewGuid(),
      Name = "Mega Image Ștefan cel Mare",
    };

    Merchant secondMerchant = new()
    {
      id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
      ParentCompanyId = Guid.NewGuid(),
      Name = "mega image stefan cel mare",
    };

    using MerchantResolutionHarness harness = MerchantResolutionHarness.WithStoredMerchants(
      firstMerchant,
      secondMerchant);

    Merchant? result = await harness
      .FindAsync("mega image stefan cel mare")
      .ConfigureAwait(false);

    Assert.IsNotNull(result);
    Assert.AreEqual(secondMerchant.id, result.id);
  }

  /// <summary>
  /// Verifies blank normalized names are rejected as orchestration validation failures.
  /// </summary>
  [TestMethod]
  public async Task FindMerchantByNormalizedNameObject_BlankName_ThrowsValidationException()
  {
    using MerchantResolutionHarness harness = MerchantResolutionHarness.WithStoredMerchant(
      "Mega Image Ștefan cel Mare");

    await Assert.ThrowsExactlyAsync<MerchantOrchestrationServiceValidationException>(() =>
      harness.FindAsync("   "));
  }
}
