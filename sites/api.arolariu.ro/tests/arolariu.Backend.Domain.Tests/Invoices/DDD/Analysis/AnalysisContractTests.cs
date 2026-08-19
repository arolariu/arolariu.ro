namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Analysis;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Defines invariant tests for analysis option and capability contracts.
/// </summary>
[TestClass]
public sealed class AnalysisContractTests
{
  /// <summary>
  /// Verifies that the comprehensive invoice preset enables the full workflow.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_Comprehensive_EnablesExpectedCapabilities()
  {
    // Act
    InvoiceAnalysisOptions options = InvoiceAnalysisOptions.Comprehensive();

    // Assert
    Assert.AreEqual(AnalysisProfile.Comprehensive, options.Profile);
    Assert.IsTrue(options.DocumentExtraction);
    Assert.IsTrue(options.MerchantResolution);
    Assert.IsTrue(options.InvoiceSummary);
    Assert.IsTrue(options.ProductClassification);
    Assert.IsTrue(options.AllergenAssessment);
    Assert.IsTrue(options.InvoiceClassification);
    Assert.IsTrue(options.RecipeGeneration);
    Assert.AreEqual(3, options.MaximumRecipes);
  }

  /// <summary>
  /// Verifies that the fast invoice preset enables only document extraction, merchant resolution, product
  /// classification, and invoice classification, with recipe generation and its limit both disabled/zeroed.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_Fast_EnablesExpectedCapabilitiesOnly()
  {
    // Act
    InvoiceAnalysisOptions options = InvoiceAnalysisOptions.Fast();

    // Assert
    Assert.AreEqual(AnalysisProfile.Fast, options.Profile);
    Assert.IsTrue(options.DocumentExtraction);
    Assert.IsTrue(options.MerchantResolution);
    Assert.IsFalse(options.InvoiceSummary);
    Assert.IsTrue(options.ProductClassification);
    Assert.IsFalse(options.AllergenAssessment);
    Assert.IsTrue(options.InvoiceClassification);
    Assert.IsFalse(options.RecipeGeneration);
    Assert.AreEqual(0, options.MaximumRecipes);
  }

  /// <summary>
  /// Verifies that the balanced invoice preset enables everything the fast preset enables plus invoice
  /// summarization and allergen assessment, while still disabling recipe generation.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_Balanced_EnablesExpectedCapabilitiesOnly()
  {
    // Act
    InvoiceAnalysisOptions options = InvoiceAnalysisOptions.Balanced();

    // Assert
    Assert.AreEqual(AnalysisProfile.Balanced, options.Profile);
    Assert.IsTrue(options.DocumentExtraction);
    Assert.IsTrue(options.MerchantResolution);
    Assert.IsTrue(options.InvoiceSummary);
    Assert.IsTrue(options.ProductClassification);
    Assert.IsTrue(options.AllergenAssessment);
    Assert.IsTrue(options.InvoiceClassification);
    Assert.IsFalse(options.RecipeGeneration);
    Assert.AreEqual(0, options.MaximumRecipes);
  }

  /// <summary>
  /// Verifies that a fast profile cannot be contradicted with manual overrides that don't match the published preset.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_FastOverrides_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new InvoiceAnalysisOptions(
      AnalysisProfile.Fast,
      documentExtraction: true,
      merchantResolution: true,
      invoiceSummary: true,
      productClassification: true,
      allergenAssessment: false,
      invoiceClassification: true,
      recipeGeneration: false,
      maximumRecipes: 0));

  /// <summary>
  /// Verifies that a balanced profile cannot be contradicted with manual overrides that don't match the published preset.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_BalancedOverrides_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new InvoiceAnalysisOptions(
      AnalysisProfile.Balanced,
      documentExtraction: true,
      merchantResolution: true,
      invoiceSummary: false,
      productClassification: true,
      allergenAssessment: true,
      invoiceClassification: true,
      recipeGeneration: false,
      maximumRecipes: 0));

  /// <summary>
  /// Verifies that recipe generation depends on product classification.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_RecipesWithoutProductClassification_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new InvoiceAnalysisOptions(
      AnalysisProfile.Custom,
      documentExtraction: true,
      merchantResolution: false,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: true,
      maximumRecipes: 1));

  /// <summary>
  /// Verifies that allergen assessment depends on product classification.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_AllergensWithoutProductClassification_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new InvoiceAnalysisOptions(
      AnalysisProfile.Custom,
      documentExtraction: true,
      merchantResolution: false,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: true,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0));

  /// <summary>
  /// Verifies that merchant resolution cannot be requested without document extraction evidence.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_MerchantResolutionWithoutDocumentExtraction_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new InvoiceAnalysisOptions(
      AnalysisProfile.Custom,
      documentExtraction: false,
      merchantResolution: true,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0));

  /// <summary>
  /// Verifies that invoice classification requires both extracted receipt data and product classifications.
  /// </summary>
  [TestMethod]
  [DataRow(false, true)]
  [DataRow(true, false)]
  public void InvoiceAnalysisOptions_InvoiceClassificationWithoutPrerequisites_ThrowsArgumentException(
    bool documentExtraction,
    bool productClassification) =>
    Assert.ThrowsExactly<ArgumentException>(() => new InvoiceAnalysisOptions(
      AnalysisProfile.Custom,
      documentExtraction,
      merchantResolution: false,
      invoiceSummary: false,
      productClassification,
      allergenAssessment: false,
      invoiceClassification: true,
      recipeGeneration: false,
      maximumRecipes: 0));

  /// <summary>
  /// RED: verifies that recipe generation depends on allergen assessment, not merely on product classification.
  /// Product classification alone (without allergen assessment) is a legal <see cref="AnalysisProfile.Custom"/>
  /// combination on its own, but pairing it with recipe generation must be rejected — otherwise the orchestration
  /// DAG (Task 9) would silently and permanently skip recipe generation for this run, because
  /// <c>AnalyzeInvoiceAsync</c> only attempts recipes once both product classification AND allergen assessment
  /// results are available.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_RecipesWithoutAllergenAssessment_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new InvoiceAnalysisOptions(
      AnalysisProfile.Custom,
      documentExtraction: true,
      merchantResolution: false,
      invoiceSummary: false,
      productClassification: true,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: true,
      maximumRecipes: 1));

  /// <summary>
  /// GREEN counterpart: verifies that recipe generation is accepted once both product classification AND allergen
  /// assessment are enabled, confirming the dependency closure requires allergen assessment specifically (not just
  /// product classification) without over-rejecting legal combinations.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_RecipesWithAllergenAssessment_DoesNotThrow()
  {
    // Act
    InvoiceAnalysisOptions options = new(
      AnalysisProfile.Custom,
      documentExtraction: true,
      merchantResolution: false,
      invoiceSummary: false,
      productClassification: true,
      allergenAssessment: true,
      invoiceClassification: false,
      recipeGeneration: true,
      maximumRecipes: 1);

    // Assert
    Assert.IsTrue(options.RecipeGeneration);
    Assert.IsTrue(options.AllergenAssessment);
    Assert.IsTrue(options.ProductClassification);
  }

  /// <summary>
  /// Verifies that recipe generation requires a positive recipe limit.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_RecipeGenerationWithoutPositiveMaximumRecipes_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new InvoiceAnalysisOptions(
      AnalysisProfile.Custom,
      documentExtraction: true,
      merchantResolution: false,
      invoiceSummary: false,
      productClassification: true,
      allergenAssessment: true,
      invoiceClassification: false,
      recipeGeneration: true,
      maximumRecipes: 0));

  /// <summary>
  /// Verifies that a comprehensive profile cannot be contradicted with manual overrides.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_ComprehensiveOverrides_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new InvoiceAnalysisOptions(
      AnalysisProfile.Comprehensive,
      documentExtraction: true,
      merchantResolution: true,
      invoiceSummary: true,
      productClassification: true,
      allergenAssessment: true,
      invoiceClassification: true,
      recipeGeneration: false,
      maximumRecipes: 0));

  /// <summary>
  /// Verifies that the comprehensive merchant preset enables both merchant capabilities.
  /// </summary>
  [TestMethod]
  public void MerchantAnalysisOptions_Comprehensive_EnablesExpectedCapabilities()
  {
    // Act
    MerchantAnalysisOptions options = MerchantAnalysisOptions.Comprehensive();

    // Assert
    Assert.AreEqual(AnalysisProfile.Comprehensive, options.Profile);
    Assert.IsTrue(options.MerchantClassification);
    Assert.IsTrue(options.DescriptionGeneration);
  }

  /// <summary>
  /// Verifies that comprehensive merchant profiles reject contradictory overrides.
  /// </summary>
  [TestMethod]
  public void MerchantAnalysisOptions_ComprehensiveOverrides_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new MerchantAnalysisOptions(
      AnalysisProfile.Comprehensive,
      merchantClassification: true,
      descriptionGeneration: false));

  /// <summary>
  /// Verifies that the fast merchant preset enables only NACE classification.
  /// </summary>
  [TestMethod]
  public void MerchantAnalysisOptions_Fast_EnablesClassificationOnly()
  {
    // Act
    MerchantAnalysisOptions options = MerchantAnalysisOptions.Fast();

    // Assert
    Assert.AreEqual(AnalysisProfile.Fast, options.Profile);
    Assert.IsTrue(options.MerchantClassification);
    Assert.IsFalse(options.DescriptionGeneration);
  }

  /// <summary>
  /// Verifies that the balanced merchant preset enables both NACE classification and description generation,
  /// matching the comprehensive preset's shape while remaining a distinct profile value for later divergence.
  /// </summary>
  [TestMethod]
  public void MerchantAnalysisOptions_Balanced_EnablesExpectedCapabilities()
  {
    // Act
    MerchantAnalysisOptions options = MerchantAnalysisOptions.Balanced();

    // Assert
    Assert.AreEqual(AnalysisProfile.Balanced, options.Profile);
    Assert.IsTrue(options.MerchantClassification);
    Assert.IsTrue(options.DescriptionGeneration);
  }

  /// <summary>
  /// Verifies that a fast merchant profile cannot be contradicted by enabling description generation.
  /// </summary>
  [TestMethod]
  public void MerchantAnalysisOptions_FastOverrides_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new MerchantAnalysisOptions(
      AnalysisProfile.Fast,
      merchantClassification: true,
      descriptionGeneration: true));

  /// <summary>
  /// Verifies that a balanced merchant profile cannot be contradicted by disabling either capability.
  /// </summary>
  [TestMethod]
  public void MerchantAnalysisOptions_BalancedOverrides_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new MerchantAnalysisOptions(
      AnalysisProfile.Balanced,
      merchantClassification: false,
      descriptionGeneration: true));

  /// <summary>
  /// Verifies that product analysis inputs require a transient correlation token.
  /// </summary>
  [TestMethod]
  public void ProductAnalysisInput_WhitespaceCorrelationToken_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new ProductAnalysisInput(
      "   ",
      new Product { Name = "Bread", Metadata = new ProductMetadata() }));

  /// <summary>
  /// Verifies that product analysis inputs reject null products.
  /// </summary>
  [TestMethod]
  public void ProductAnalysisInput_NullProduct_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() => new ProductAnalysisInput("product-1", null!));

  /// <summary>
  /// Verifies that capability success outcomes store the supplied section value.
  /// </summary>
  [TestMethod]
  public void CapabilityOutcome_SuccessFactory_CreatesSuccessfulOutcome()
  {
    // Act
    CapabilityOutcome<string> outcome = CapabilityOutcome<string>.Success("summary");

    // Assert
    Assert.IsTrue(outcome.Succeeded);
    Assert.AreEqual("summary", outcome.Value);
    Assert.IsNull(outcome.FailureCode);
  }

  /// <summary>
  /// Verifies that capability failure outcomes store the supplied failure code.
  /// </summary>
  [TestMethod]
  public void CapabilityOutcome_FailureFactory_CreatesFailureOutcome()
  {
    // Act
    CapabilityOutcome<string> outcome = CapabilityOutcome<string>.Failure("structured-output-invalid");

    // Assert
    Assert.IsFalse(outcome.Succeeded);
    Assert.IsNull(outcome.Value);
    Assert.AreEqual("structured-output-invalid", outcome.FailureCode);
  }

  /// <summary>
  /// Verifies that value-type payloads are rejected by the generic constraint.
  /// </summary>
  [TestMethod]
  public void CapabilityOutcome_OpenGenericWithValueType_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => typeof(CapabilityOutcome<>).MakeGenericType(typeof(int)));

  /// <summary>
  /// Verifies that successful outcomes cannot also carry a failure code.
  /// </summary>
  [TestMethod]
  public void CapabilityOutcome_SuccessWithFailureCode_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new CapabilityOutcome<string>(
      succeeded: true,
      value: "value",
      failureCode: "should-not-exist"));
}
