namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests immutable classification value object guards and snapshot behavior.
/// </summary>
[TestClass]
public sealed class ClassificationValueObjectTests
{
  /// <summary>
  /// Verifies that a valid analysis classification captures all supplied values.
  /// </summary>
  [TestMethod]
  public void StandardClassification_ValidAnalysisInput_CreatesImmutableSnapshot()
  {
    // Arrange
    var hierarchy = new List<ClassificationNode>
    {
      new("division", "01", "Food and non-alcoholic beverages"),
      new("group", "01.1", "Food")
    };

    var evidence = new List<ClassificationEvidence>
    {
      new("product.name", "wholegrain bread")
    };

    // Act
    var classification = new StandardClassification(
      ClassificationSystem.EcoicopV2,
      "2",
      "01.1",
      "Food",
      hierarchy,
      ClassificationOrigin.Analysis,
      0.92,
      evidence);

    hierarchy.Add(new ClassificationNode("class", "01.1.1", "Cereals and cereal products (ND)"));
    evidence.Clear();

    // Assert
    Assert.AreEqual(ClassificationSystem.EcoicopV2, classification.System);
    Assert.AreEqual("2", classification.Version);
    Assert.AreEqual("01.1", classification.Code);
    Assert.AreEqual("Food", classification.OfficialLabel);
    Assert.AreEqual(ClassificationOrigin.Analysis, classification.Origin);
    Assert.AreEqual(0.92, classification.Confidence);
    Assert.AreEqual(2, classification.Hierarchy.Count);
    Assert.AreEqual(1, classification.Evidence.Count);
  }

  /// <summary>
  /// Verifies that manual classifications cannot carry confidence values.
  /// </summary>
  [TestMethod]
  public void StandardClassification_ManualOriginWithConfidence_ThrowsArgumentException()
  {
    // Arrange
    IReadOnlyList<ClassificationNode> hierarchy =
    [
      new ClassificationNode("division", "01", "Food and non-alcoholic beverages"),
      new ClassificationNode("group", "01.1", "Food")
    ];

    // Act & Assert
    Assert.ThrowsExactly<ArgumentException>(() => new StandardClassification(
      ClassificationSystem.EcoicopV2,
      "2",
      "01.1",
      "Food",
      hierarchy,
      ClassificationOrigin.Manual,
      0.15,
      []));
  }

  /// <summary>
  /// Verifies that analysis classifications require a confidence value.
  /// </summary>
  [TestMethod]
  public void StandardClassification_AnalysisOriginWithoutConfidence_ThrowsArgumentException()
  {
    // Arrange
    IReadOnlyList<ClassificationNode> hierarchy =
    [
      new ClassificationNode("section", "A", "Agriculture, forestry and fishing"),
      new ClassificationNode("division", "01", "Crop and animal production, hunting and related service activities")
    ];

    // Act & Assert
    Assert.ThrowsExactly<ArgumentException>(() => new StandardClassification(
      ClassificationSystem.Nace21,
      "2.1",
      "01",
      "Crop and animal production, hunting and related service activities",
      hierarchy,
      ClassificationOrigin.Analysis,
      confidence: null,
      []));
  }

  /// <summary>
  /// Verifies that hierarchy validation requires the last node to match the selected code.
  /// </summary>
  [TestMethod]
  public void StandardClassification_HierarchyEndingWithDifferentCode_ThrowsArgumentException()
  {
    // Arrange
    IReadOnlyList<ClassificationNode> hierarchy =
    [
      new ClassificationNode("division", "01", "Food and non-alcoholic beverages"),
      new ClassificationNode("group", "01.1", "Food")
    ];

    // Act & Assert
    Assert.ThrowsExactly<ArgumentException>(() => new StandardClassification(
      ClassificationSystem.EcoicopV2,
      "2",
      "01.1.1",
      "Cereals and cereal products (ND)",
      hierarchy,
      ClassificationOrigin.Analysis,
      0.75,
      []));
  }

  /// <summary>
  /// Verifies that classification nodes reject empty levels.
  /// </summary>
  [TestMethod]
  public void ClassificationNode_EmptyLevel_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new ClassificationNode("", "01.1", "Food"));

  /// <summary>
  /// Verifies that classification evidence rejects empty sources.
  /// </summary>
  [TestMethod]
  public void ClassificationEvidence_EmptySource_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new ClassificationEvidence("", "bread"));
}
