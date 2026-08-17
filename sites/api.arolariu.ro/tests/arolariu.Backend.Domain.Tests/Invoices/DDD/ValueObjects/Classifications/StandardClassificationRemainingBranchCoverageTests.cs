namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects.Classifications;

using System;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers remaining branch-sensitive paths in standard classification value objects.
/// </summary>
[TestClass]
public sealed class StandardClassificationRemainingBranchCoverageTests
{
  /// <summary>
  /// Verifies an empty hierarchy is rejected after the constructor snapshots both collections.
  /// </summary>
  [TestMethod]
  public void StandardClassification_EmptyHierarchy_ThrowsArgumentException()
  {
    Assert.ThrowsExactly<ArgumentException>(() => new StandardClassification(
      ClassificationSystem.EcoicopV2,
      "2026",
      "01",
      "Food",
      [],
      ClassificationOrigin.Analysis,
      0.8,
      [new ClassificationEvidence("source", "evidence")]));
  }

  /// <summary>
  /// Verifies a non-empty hierarchy whose terminal node matches the code creates a classification.
  /// </summary>
  [TestMethod]
  public void StandardClassification_NonEmptyMatchingHierarchy_CreatesClassification()
  {
    StandardClassification classification = CreateAnalysisClassification();

    Assert.AreEqual(1, classification.Hierarchy.Count);
    Assert.AreEqual("01", classification.Hierarchy[0].Code);
  }

  /// <summary>
  /// Verifies equality returns false before item comparison when hierarchy sequence lengths differ.
  /// </summary>
  [TestMethod]
  public void Equals_DifferentHierarchyLengths_ReturnsFalse()
  {
    StandardClassification left = CreateAnalysisClassification();
    StandardClassification right = CreateAnalysisClassification(
      code: "01.1",
      officialLabel: "Food subgroup",
      hierarchy:
      [
        new ClassificationNode("division", "01", "Food"),
        new ClassificationNode("group", "01.1", "Food subgroup"),
      ]);

    Assert.IsFalse(left.Equals(right));
  }

  /// <summary>
  /// Verifies classification confidence rejects NaN values.
  /// </summary>
  [TestMethod]
  public void StandardClassification_NaNConfidence_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => CreateAnalysisClassification(confidence: double.NaN));

  /// <summary>
  /// Verifies classification confidence rejects infinite values.
  /// </summary>
  [TestMethod]
  public void StandardClassification_InfiniteConfidence_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => CreateAnalysisClassification(confidence: double.PositiveInfinity));

  /// <summary>
  /// Verifies classification confidence rejects values below zero.
  /// </summary>
  [TestMethod]
  public void StandardClassification_NegativeConfidence_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => CreateAnalysisClassification(confidence: -0.1));

  /// <summary>
  /// Verifies classification confidence rejects values above one.
  /// </summary>
  [TestMethod]
  public void StandardClassification_ConfidenceGreaterThanOne_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => CreateAnalysisClassification(confidence: 1.1));

  /// <summary>
  /// Verifies classification confidence accepts a value inside the inclusive range.
  /// </summary>
  [TestMethod]
  public void StandardClassification_ValidConfidence_CreatesClassification()
  {
    StandardClassification classification = CreateAnalysisClassification(confidence: 0.5);

    Assert.AreEqual(0.5, classification.Confidence);
  }

  /// <summary>
  /// Verifies hierarchy snapshot rejects a null collection item.
  /// </summary>
  [TestMethod]
  public void StandardClassification_NullHierarchyItem_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new StandardClassification(
      ClassificationSystem.EcoicopV2,
      "2026",
      "01",
      "Food",
      [null!],
      ClassificationOrigin.Analysis,
      0.8,
      [new ClassificationEvidence("source", "evidence")]));

  private static StandardClassification CreateAnalysisClassification(
    string code = "01",
    string officialLabel = "Food",
    ClassificationNode[]? hierarchy = null,
    double confidence = 0.8) =>
    new(
      ClassificationSystem.EcoicopV2,
      "2026",
      code,
      officialLabel,
      hierarchy ?? [new ClassificationNode("division", code, officialLabel)],
      ClassificationOrigin.Analysis,
      confidence,
      [new ClassificationEvidence("source", "evidence")]);
}
