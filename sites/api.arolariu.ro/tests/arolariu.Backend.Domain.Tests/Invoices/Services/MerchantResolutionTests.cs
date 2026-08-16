namespace arolariu.Backend.Domain.Tests.Invoices.Services;

using System;
using System.Threading;
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
  /// Verifies compatibility ligatures, full-width letters, and full-width spaces normalize to the same canonical merchant name.
  /// </summary>
  [TestMethod]
  public async Task FindMerchantByNormalizedNameObject_CompatibilityLigatureAndFullWidthDifference_ReturnsMatch()
  {
    using MerchantResolutionHarness harness = MerchantResolutionHarness.WithStoredMerchant(
      "Ｏﬃce　Depot");

    Merchant? result = await harness
      .FindAsync("office depot")
      .ConfigureAwait(false);

    Assert.IsNotNull(result);
    Assert.AreEqual("Ｏﬃce　Depot", result.Name);
  }

  /// <summary>
  /// Verifies duplicate matches spanning multiple Cosmos pages still resolve deterministically to the lowest identifier.
  /// </summary>
  [TestMethod]
  public async Task FindMerchantByNormalizedNameObject_DuplicateMatchesAcrossPages_ReturnsLowestIdentifier()
  {
    Merchant firstPageMatch = new()
    {
      id = Guid.Parse("f0000000-0000-0000-0000-000000000000"),
      ParentCompanyId = Guid.NewGuid(),
      Name = "Mega Image Ștefan cel Mare",
    };

    Merchant secondPageMatch = new()
    {
      id = Guid.Parse("00000000-0000-0000-0000-000000000002"),
      ParentCompanyId = Guid.NewGuid(),
      Name = "MEGA IMAGE STEFAN CEL MARE",
    };

    using MerchantResolutionHarness harness = MerchantResolutionHarness.WithStoredMerchantPages(
      [
        firstPageMatch,
      ],
      [
        secondPageMatch,
      ]);

    Merchant? result = await harness
      .FindAsync("mega image stefan cel mare")
      .ConfigureAwait(false);

    Assert.IsNotNull(result);
    Assert.AreEqual(secondPageMatch.id, result.id);
    Assert.AreEqual(2, harness.FeedReadInvocationCount);
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

  /// <summary>
  /// Verifies combining-mark-only input is rejected before Cosmos query execution begins.
  /// </summary>
  [TestMethod]
  public async Task FindMerchantByNormalizedNameObject_CombiningMarkOnlyInput_ThrowsValidationExceptionWithoutCosmosQuery()
  {
    using MerchantResolutionHarness harness = MerchantResolutionHarness.WithStoredMerchant(
      "Mega Image Ștefan cel Mare");

    await Assert.ThrowsExactlyAsync<MerchantOrchestrationServiceValidationException>(() =>
      harness.FindAsync("\u0301\u0308"));

    Assert.AreEqual(0, harness.QueryIteratorInvocationCount);
    Assert.AreEqual(0, harness.FeedReadInvocationCount);
  }

  /// <summary>
  /// Verifies cancellation flows through merchant resolution without being wrapped into orchestration fault exceptions.
  /// </summary>
  [TestMethod]
  public async Task FindMerchantByNormalizedNameObject_CancellationRequestedBetweenPages_ThrowsOperationCanceledException()
  {
    using var cancellationTokenSource = new CancellationTokenSource();
    Merchant pageOneMerchant = new()
    {
      id = Guid.NewGuid(),
      ParentCompanyId = Guid.NewGuid(),
      Name = "Unmatched Merchant",
    };

    Merchant pageTwoMerchant = new()
    {
      id = Guid.NewGuid(),
      ParentCompanyId = Guid.NewGuid(),
      Name = "Mega Image Ștefan cel Mare",
    };

    using MerchantResolutionHarness harness = MerchantResolutionHarness.WithStoredMerchantPages(
      onPageRead: (pageIndex, _) =>
      {
        if (pageIndex is 0)
        {
          cancellationTokenSource.Cancel();
        }
      },
      [
        pageOneMerchant,
      ],
      [
        pageTwoMerchant,
      ]);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
      harness.FindAsync("mega image stefan cel mare", cancellationTokenSource.Token));

    Assert.AreEqual(cancellationTokenSource.Token, harness.LastObservedCancellationToken);
    Assert.AreEqual(1, harness.FeedReadInvocationCount);
  }
}
