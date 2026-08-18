namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Analysis.Contracts;

using System;
using System.Reflection;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers remaining analysis contract guard and option shape branches.
/// </summary>
[TestClass]
public sealed class AnalysisContractRemainingBranchCoverageTests
{
  private static readonly Type[] HasFastShapeParameterTypes =
  [
    typeof(bool),
    typeof(bool),
    typeof(bool),
    typeof(bool),
    typeof(bool),
    typeof(bool),
    typeof(bool),
    typeof(int),
  ];

  /// <summary>
  /// Verifies analysis confidence rejects NaN values.
  /// </summary>
  [TestMethod]
  public void RequireConfidence_NaN_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => AnalysisContractGuards.RequireConfidence(double.NaN, "confidence"));

  /// <summary>
  /// Verifies analysis confidence rejects infinite values.
  /// </summary>
  [TestMethod]
  public void RequireConfidence_Infinity_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => AnalysisContractGuards.RequireConfidence(double.PositiveInfinity, "confidence"));

  /// <summary>
  /// Verifies analysis confidence rejects values below zero.
  /// </summary>
  [TestMethod]
  public void RequireConfidence_Negative_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => AnalysisContractGuards.RequireConfidence(-0.1, "confidence"));

  /// <summary>
  /// Verifies analysis confidence rejects values above one.
  /// </summary>
  [TestMethod]
  public void RequireConfidence_GreaterThanOne_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => AnalysisContractGuards.RequireConfidence(1.1, "confidence"));

  /// <summary>
  /// Verifies analysis confidence accepts a value inside the inclusive range.
  /// </summary>
  [TestMethod]
  public void RequireConfidence_ValidValue_ReturnsValue() =>
    Assert.AreEqual(0.5, AnalysisContractGuards.RequireConfidence(0.5, "confidence"));

  /// <summary>
  /// Verifies a merchant candidate whose name normalizes to null stores the empty-string fallback.
  /// </summary>
  [TestMethod]
  public void MerchantCandidate_WhitespaceName_StoresEmptyName()
  {
    var candidate = new MerchantCandidate("   ", "address", "phone", 0.9, 0.8, 0.7);

    Assert.AreEqual(string.Empty, candidate.Name);
  }

  /// <summary>
  /// Verifies fast invoice option shape validation rejects every single-operand mismatch in the published shape.
  /// </summary>
  /// <param name="documentExtraction">Whether document extraction is enabled.</param>
  /// <param name="merchantResolution">Whether merchant resolution is enabled.</param>
  /// <param name="invoiceSummary">Whether invoice summary is enabled.</param>
  /// <param name="productClassification">Whether product classification is enabled.</param>
  /// <param name="allergenAssessment">Whether allergen assessment is enabled.</param>
  /// <param name="invoiceClassification">Whether invoice classification is enabled.</param>
  /// <param name="recipeGeneration">Whether recipe generation is enabled.</param>
  /// <param name="maximumRecipes">The maximum recipes value.</param>
  [TestMethod]
  [DataRow(false, true, false, true, false, true, false, 0)]
  [DataRow(true, false, false, true, false, true, false, 0)]
  [DataRow(true, true, true, true, false, true, false, 0)]
  [DataRow(true, true, false, false, false, true, false, 0)]
  [DataRow(true, true, false, true, true, true, false, 0)]
  [DataRow(true, true, false, true, false, false, false, 0)]
  public void InvoiceAnalysisOptions_FastSingleOperandMismatch_ThrowsArgumentException(
    bool documentExtraction,
    bool merchantResolution,
    bool invoiceSummary,
    bool productClassification,
    bool allergenAssessment,
    bool invoiceClassification,
    bool recipeGeneration,
    int maximumRecipes) =>
    Assert.ThrowsExactly<ArgumentException>(() => new InvoiceAnalysisOptions(
      AnalysisProfile.Fast,
      documentExtraction,
      merchantResolution,
      invoiceSummary,
      productClassification,
      allergenAssessment,
      invoiceClassification,
      recipeGeneration,
      maximumRecipes));

  /// <summary>
  /// Verifies the private fast-shape predicate evaluates every operand in the published shape both ways.
  /// </summary>
  /// <param name="documentExtraction">Whether document extraction is enabled.</param>
  /// <param name="merchantResolution">Whether merchant resolution is enabled.</param>
  /// <param name="invoiceSummary">Whether invoice summary is enabled.</param>
  /// <param name="productClassification">Whether product classification is enabled.</param>
  /// <param name="allergenAssessment">Whether allergen assessment is enabled.</param>
  /// <param name="invoiceClassification">Whether invoice classification is enabled.</param>
  /// <param name="recipeGeneration">Whether recipe generation is enabled.</param>
  /// <param name="maximumRecipes">The maximum recipes value.</param>
  /// <param name="expected">The expected predicate result.</param>
  [TestMethod]
  [DataRow(true, true, false, true, false, true, false, 0, true)]
  [DataRow(false, true, false, true, false, true, false, 0, false)]
  [DataRow(true, false, false, true, false, true, false, 0, false)]
  [DataRow(true, true, true, true, false, true, false, 0, false)]
  [DataRow(true, true, false, false, false, true, false, 0, false)]
  [DataRow(true, true, false, true, true, true, false, 0, false)]
  [DataRow(true, true, false, true, false, false, false, 0, false)]
  [DataRow(true, true, false, true, false, true, true, 0, false)]
  [DataRow(true, true, false, true, false, true, false, 1, false)]
  public void HasFastShape_AllOperandVariants_ReturnsExpectedValue(
    bool documentExtraction,
    bool merchantResolution,
    bool invoiceSummary,
    bool productClassification,
    bool allergenAssessment,
    bool invoiceClassification,
    bool recipeGeneration,
    int maximumRecipes,
    bool expected)
  {
    MethodInfo? method = typeof(InvoiceAnalysisOptions).GetMethod(
      "HasFastShape",
      BindingFlags.NonPublic | BindingFlags.Static,
      binder: null,
      HasFastShapeParameterTypes,
      modifiers: null);

    if (method is null)
    {
      throw new MissingMethodException(typeof(InvoiceAnalysisOptions).FullName, "HasFastShape");
    }

    object? actual = method.Invoke(
      null,
      [
        documentExtraction,
        merchantResolution,
        invoiceSummary,
        productClassification,
        allergenAssessment,
        invoiceClassification,
        recipeGeneration,
        maximumRecipes,
      ]);

    Assert.AreEqual(expected, actual);
  }

  /// <summary>
  /// Verifies the published fast invoice option shape is accepted.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_FastPublishedShape_CreatesOptions()
  {
    InvoiceAnalysisOptions options = new(
      AnalysisProfile.Fast,
      documentExtraction: true,
      merchantResolution: true,
      invoiceSummary: false,
      productClassification: true,
      allergenAssessment: false,
      invoiceClassification: true,
      recipeGeneration: false,
      maximumRecipes: 0);

    Assert.AreEqual(AnalysisProfile.Fast, options.Profile);
  }

  /// <summary>
  /// Verifies comprehensive merchant option validation rejects each missing-capability combination.
  /// </summary>
  /// <param name="merchantClassification">Whether merchant classification is enabled.</param>
  /// <param name="descriptionGeneration">Whether description generation is enabled.</param>
  [TestMethod]
  [DataRow(false, true)]
  [DataRow(true, false)]
  [DataRow(false, false)]
  public void MerchantAnalysisOptions_ComprehensiveMissingCapability_ThrowsArgumentException(
    bool merchantClassification,
    bool descriptionGeneration) =>
    Assert.ThrowsExactly<ArgumentException>(() => new MerchantAnalysisOptions(
      AnalysisProfile.Comprehensive,
      merchantClassification,
      descriptionGeneration));

  /// <summary>
  /// Verifies non-comprehensive merchant options do not enter the comprehensive shape guard.
  /// </summary>
  [TestMethod]
  public void MerchantAnalysisOptions_CustomMissingCapabilities_CreatesOptions()
  {
    MerchantAnalysisOptions options = new(
      AnalysisProfile.Custom,
      merchantClassification: false,
      descriptionGeneration: false);

    Assert.AreEqual(AnalysisProfile.Custom, options.Profile);
  }

  /// <summary>
  /// Verifies comprehensive merchant options accept the all-capabilities-enabled shape.
  /// </summary>
  [TestMethod]
  public void MerchantAnalysisOptions_ComprehensiveAllCapabilities_CreatesOptions()
  {
    MerchantAnalysisOptions options = new(
      AnalysisProfile.Comprehensive,
      merchantClassification: true,
      descriptionGeneration: true);

    Assert.AreEqual(AnalysisProfile.Comprehensive, options.Profile);
  }
}
