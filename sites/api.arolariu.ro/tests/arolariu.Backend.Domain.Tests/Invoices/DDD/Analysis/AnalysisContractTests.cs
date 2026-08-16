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
      allergenAssessment: false,
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
