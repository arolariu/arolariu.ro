namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Analysis.Contracts;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers analysis contract constructor and shared guard validation branches not exercised by preset tests.
/// </summary>
[TestClass]
public sealed class AnalysisContractGuardCoverageTests
{
  /// <summary>
  /// Verifies invoice options reject undefined profiles.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_UndefinedProfile_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new InvoiceAnalysisOptions(
      (AnalysisProfile)999,
      documentExtraction: true,
      merchantResolution: false,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0));

  /// <summary>
  /// Verifies invoice options reject negative recipe limits before profile shape checks.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_NegativeMaximumRecipes_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new InvoiceAnalysisOptions(
      AnalysisProfile.Custom,
      documentExtraction: true,
      merchantResolution: false,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: -1));

  /// <summary>
  /// Verifies invoice options reject a disabled recipe capability paired with a non-zero limit.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisOptions_RecipeDisabledWithLimit_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new InvoiceAnalysisOptions(
      AnalysisProfile.Custom,
      documentExtraction: true,
      merchantResolution: false,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 1));

  /// <summary>
  /// Verifies merchant options reject undefined profiles.
  /// </summary>
  [TestMethod]
  public void MerchantAnalysisOptions_UndefinedProfile_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
      new MerchantAnalysisOptions((AnalysisProfile)999, merchantClassification: true, descriptionGeneration: true));

  /// <summary>
  /// Verifies custom merchant options accept the non-throwing custom shape side of constructor guards.
  /// </summary>
  [TestMethod]
  public void MerchantAnalysisOptions_CustomClassificationOnly_CreatesOptions()
  {
    MerchantAnalysisOptions options = new(
      AnalysisProfile.Custom,
      merchantClassification: true,
      descriptionGeneration: false);

    Assert.AreEqual(AnalysisProfile.Custom, options.Profile);
    Assert.IsTrue(options.MerchantClassification);
    Assert.IsFalse(options.DescriptionGeneration);
  }

  /// <summary>
  /// Verifies successful capability outcomes require a non-null payload.
  /// </summary>
  [TestMethod]
  public void CapabilityOutcome_SuccessWithNullValue_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() =>
      new CapabilityOutcome<string>(succeeded: true, value: null, failureCode: null));

  /// <summary>
  /// Verifies failed capability outcomes cannot carry a payload.
  /// </summary>
  [TestMethod]
  public void CapabilityOutcome_FailureWithValue_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      new CapabilityOutcome<string>(succeeded: false, value: "value", failureCode: "failed"));

  /// <summary>
  /// Verifies failed capability outcomes require a non-blank failure code.
  /// </summary>
  [TestMethod]
  public void CapabilityOutcome_FailureWithBlankCode_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      CapabilityOutcome<string>.Failure("   "));

  /// <summary>
  /// Verifies non-default GUID guards reject the default sentinel and accept real identifiers.
  /// </summary>
  [TestMethod]
  public void RequireNonDefault_DefaultAndRealGuid_ThrowsThenReturnsValue()
  {
    Guid identifier = Guid.NewGuid();

    Assert.ThrowsExactly<ArgumentException>(() => AnalysisContractGuards.RequireNonDefault(Guid.Empty, "identifier"));
    Assert.AreEqual(identifier, AnalysisContractGuards.RequireNonDefault(identifier, "identifier"));
  }

  /// <summary>
  /// Verifies non-negative integer guards reject negative values and accept zero.
  /// </summary>
  [TestMethod]
  public void RequireNonNegative_NegativeAndZero_ThrowsThenReturnsValue()
  {
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => AnalysisContractGuards.RequireNonNegative(-1, "value"));
    Assert.AreEqual(0, AnalysisContractGuards.RequireNonNegative(0, "value"));
  }

  /// <summary>
  /// Verifies confidence guards reject values below zero and above one while accepting boundaries.
  /// </summary>
  /// <param name="confidence">The invalid confidence value.</param>
  [TestMethod]
  [DataRow(-0.01)]
  [DataRow(1.01)]
  public void RequireConfidence_OutOfRange_ThrowsArgumentOutOfRangeException(double confidence) =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => AnalysisContractGuards.RequireConfidence(confidence, "confidence"));

  /// <summary>
  /// Verifies confidence guards accept valid boundary values.
  /// </summary>
  /// <param name="confidence">The valid confidence value.</param>
  [TestMethod]
  [DataRow(0.0)]
  [DataRow(1.0)]
  public void RequireConfidence_ValidBoundary_ReturnsValue(double confidence) =>
    Assert.AreEqual(confidence, AnalysisContractGuards.RequireConfidence(confidence, "confidence"));

  /// <summary>
  /// Verifies manual classifications may carry a null confidence value.
  /// </summary>
  [TestMethod]
  public void StandardClassification_ManualWithNullConfidence_CreatesClassification()
  {
    StandardClassification classification = new(
      ClassificationSystem.Nace21,
      "2.1",
      "A",
      "Agriculture",
      [new ClassificationNode("section", "A", "Agriculture")],
      ClassificationOrigin.Manual,
      confidence: null,
      evidence: []);

    Assert.IsNull(classification.Confidence);
  }

  /// <summary>
  /// Verifies guard snapshots reject null collections.
  /// </summary>
  [TestMethod]
  public void Snapshot_NullCollection_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() => AnalysisContractGuards.Snapshot<string>(null!, "items"));

  /// <summary>
  /// Verifies guard snapshots reject null items inside otherwise non-null collections.
  /// </summary>
  [TestMethod]
  public void Snapshot_NullItem_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => AnalysisContractGuards.Snapshot<string>(["ok", null!], "items"));

  /// <summary>
  /// Verifies guard snapshots copy valid collections so later caller mutations do not change the snapshot.
  /// </summary>
  [TestMethod]
  public void Snapshot_ValidCollection_ReturnsIndependentReadOnlyCopy()
  {
    var source = new List<string> { "first" };

    IReadOnlyList<string> snapshot = AnalysisContractGuards.Snapshot(source, "items");
    source[0] = "changed";

    Assert.AreEqual("first", snapshot[0]);
  }
}

