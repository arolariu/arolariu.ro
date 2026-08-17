namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies custom invoice and merchant capability toggles omit disabled or dependency-skipped result sections.
/// </summary>
[TestClass]
public sealed class AnalysisOrchestrationCapabilityToggleTests
{
  /// <summary>Verifies disabled document extraction leaves every extraction-dependent invoice section absent.</summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_DocumentExtractionDisabled_SkipsExtractionAndDependentCapabilities()
  {
    var options = new InvoiceAnalysisOptions(
      AnalysisProfile.Custom,
      false,
      true,
      true,
      true,
      true,
      true,
      true,
      3);

    InvoiceAnalysisResult result = await AnalyzeInvoiceAsync(options).ConfigureAwait(true);

    Assert.IsNull(result.ExtractionResult);
    Assert.IsNull(result.MerchantCandidateResult);
    Assert.IsNull(result.SummaryResult);
    Assert.IsNull(result.ProductClassificationResult);
    Assert.IsNull(result.AllergenAssessmentResult);
    Assert.IsNull(result.InvoiceClassificationResult);
    Assert.IsNull(result.RecipeGenerationResult);
    Assert.AreEqual(0, result.CompletedCapabilities.Count);
  }

  /// <summary>Verifies disabled invoice summary omits only the summary section from an otherwise complete run.</summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_InvoiceSummaryDisabled_OmitsSummaryOnly()
  {
    var options = new InvoiceAnalysisOptions(AnalysisProfile.Custom, true, true, false, true, true, true, true, 3);

    InvoiceAnalysisResult result = await AnalyzeInvoiceAsync(options).ConfigureAwait(true);

    Assert.IsNull(result.SummaryResult);
    AssertCompletedDoesNotContain(result, AnalysisCapability.InvoiceSummary);
    Assert.IsNotNull(result.ProductClassificationResult);
    Assert.IsNotNull(result.AllergenAssessmentResult);
    Assert.IsNotNull(result.InvoiceClassificationResult);
    Assert.IsNotNull(result.RecipeGenerationResult);
  }

  /// <summary>Verifies disabled product classification skips product-dependent invoice capabilities.</summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_ProductClassificationDisabled_SkipsProductAndDependentCapabilities()
  {
    var options = new InvoiceAnalysisOptions(AnalysisProfile.Custom, true, true, true, false, false, true, false, 0);

    InvoiceAnalysisResult result = await AnalyzeInvoiceAsync(options).ConfigureAwait(true);

    Assert.IsNotNull(result.SummaryResult);
    Assert.IsNull(result.ProductClassificationResult);
    Assert.IsNull(result.AllergenAssessmentResult);
    Assert.IsNull(result.InvoiceClassificationResult);
    Assert.IsNull(result.RecipeGenerationResult);
    AssertCompletedDoesNotContain(result, AnalysisCapability.ProductClassification);
    AssertCompletedDoesNotContain(result, AnalysisCapability.InvoiceClassification);
  }

  /// <summary>Verifies disabled allergen assessment skips allergens and recipes while invoice classification still runs.</summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_AllergenAssessmentDisabled_SkipsAllergensAndRecipes()
  {
    var options = new InvoiceAnalysisOptions(AnalysisProfile.Custom, true, true, true, true, false, true, false, 0);

    InvoiceAnalysisResult result = await AnalyzeInvoiceAsync(options).ConfigureAwait(true);

    Assert.IsNotNull(result.ProductClassificationResult);
    Assert.IsNotNull(result.InvoiceClassificationResult);
    Assert.IsNull(result.AllergenAssessmentResult);
    Assert.IsNull(result.RecipeGenerationResult);
    AssertCompletedDoesNotContain(result, AnalysisCapability.AllergenAssessment);
    AssertCompletedDoesNotContain(result, AnalysisCapability.RecipeGeneration);
  }

  /// <summary>Verifies disabled invoice classification does not suppress recipe generation.</summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_InvoiceClassificationDisabled_OmitsInvoiceClassificationOnly()
  {
    var options = new InvoiceAnalysisOptions(AnalysisProfile.Custom, true, true, true, true, true, false, true, 3);

    InvoiceAnalysisResult result = await AnalyzeInvoiceAsync(options).ConfigureAwait(true);

    Assert.IsNull(result.InvoiceClassificationResult);
    AssertCompletedDoesNotContain(result, AnalysisCapability.InvoiceClassification);
    Assert.IsNotNull(result.RecipeGenerationResult);
  }

  /// <summary>Verifies disabled recipe generation omits only recipes after all prerequisites succeed.</summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_RecipeGenerationDisabled_OmitsRecipesOnly()
  {
    var options = new InvoiceAnalysisOptions(AnalysisProfile.Custom, true, true, true, true, true, true, false, 0);

    InvoiceAnalysisResult result = await AnalyzeInvoiceAsync(options).ConfigureAwait(true);

    Assert.IsNull(result.RecipeGenerationResult);
    AssertCompletedDoesNotContain(result, AnalysisCapability.RecipeGeneration);
    Assert.IsNotNull(result.AllergenAssessmentResult);
    Assert.IsNotNull(result.InvoiceClassificationResult);
  }

  /// <summary>Verifies disabled merchant classification omits classification while description generation still runs.</summary>
  [TestMethod]
  public async Task AnalyzeMerchantAsync_MerchantClassificationDisabled_OmitsClassificationOnly()
  {
    var options = new MerchantAnalysisOptions(AnalysisProfile.Custom, merchantClassification: false, descriptionGeneration: true);

    MerchantAnalysisResult result = await AnalyzeMerchantAsync(options).ConfigureAwait(true);

    Assert.IsNull(result.ClassificationResult);
    Assert.IsNotNull(result.DescriptionResult);
    Assert.IsFalse(result.CompletedCapabilities.Contains(AnalysisCapability.MerchantClassification));
    Assert.IsTrue(result.CompletedCapabilities.Contains(AnalysisCapability.DescriptionGeneration));
  }

  /// <summary>Verifies disabled description generation omits description while merchant classification still runs.</summary>
  [TestMethod]
  public async Task AnalyzeMerchantAsync_DescriptionGenerationDisabled_OmitsDescriptionOnly()
  {
    var options = new MerchantAnalysisOptions(AnalysisProfile.Custom, merchantClassification: true, descriptionGeneration: false);

    MerchantAnalysisResult result = await AnalyzeMerchantAsync(options).ConfigureAwait(true);

    Assert.IsNotNull(result.ClassificationResult);
    Assert.IsNull(result.DescriptionResult);
    Assert.IsTrue(result.CompletedCapabilities.Contains(AnalysisCapability.MerchantClassification));
    Assert.IsFalse(result.CompletedCapabilities.Contains(AnalysisCapability.DescriptionGeneration));
  }

  private static async Task<InvoiceAnalysisResult> AnalyzeInvoiceAsync(InvoiceAnalysisOptions options)
  {
    var service = AnalysisOrchestrationTestData.CreateService();
    return await service.AnalyzeInvoiceAsync(
      AnalysisOrchestrationTestData.CreateInvoiceRun(options),
      AnalysisOrchestrationTestData.CreateInvoice(),
      CancellationToken.None).ConfigureAwait(true);
  }

  private static async Task<MerchantAnalysisResult> AnalyzeMerchantAsync(MerchantAnalysisOptions options)
  {
    var service = AnalysisOrchestrationTestData.CreateService();
    return await service.AnalyzeMerchantAsync(
      AnalysisOrchestrationTestData.CreateMerchantRun(options),
      AnalysisOrchestrationTestData.CreateMerchant(),
      CancellationToken.None).ConfigureAwait(true);
  }

  private static void AssertCompletedDoesNotContain(InvoiceAnalysisResult result, AnalysisCapability capability) =>
    Assert.IsFalse(result.CompletedCapabilities.Contains(capability), $"Capability '{capability}' should not be completed.");
}
