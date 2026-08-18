namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers merchant description branches where optional merchant evidence collections and contact information are null.
/// </summary>
[TestClass]
public sealed class GenerativeAnalysisMerchantDescriptionNullEvidenceTests
{
  /// <summary>
  /// Verifies null merchant evidence collections and contact information are treated as absent weak evidence.
  /// </summary>
  [TestMethod]
  public async Task GenerateMerchantDescriptionAsync_NullOptionalEvidence_ReturnsQualifiedDescription()
  {
    Merchant merchant = CreateMerchantWithNullOptionalEvidence();
    MerchantDescriptionHarness harness = MerchantDescriptionHarness.WithResponse(
      "Likely a merchant with limited invoice evidence.",
      merchant);

    MerchantDescriptionResult result = await harness.ExecuteAsync();

    Assert.AreEqual("Likely a merchant with limited invoice evidence.", result.Description);
    Assert.AreEqual(1, harness.Broker.InvocationCount);
  }

  private static Merchant CreateMerchantWithNullOptionalEvidence() =>
    new()
    {
      Name = "Sparse Market",
      Description = string.Empty,
      Classification = null,
      Address = null!,
      ReferencedInvoices = null!,
      AdditionalMetadata = null!,
      ParentCompanyId = Guid.Empty,
    };
}

