namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects.Classifications;

using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers the sequence-length guard used by standard classification structural equality.
/// </summary>
[TestClass]
public sealed class StandardClassificationSequenceLengthTests
{
  /// <summary>
  /// Verifies classifications with hierarchies of different lengths are not structurally equal.
  /// </summary>
  [TestMethod]
  public void Equals_HierarchiesWithDifferentLengths_ReturnsFalse()
  {
    StandardClassification shortHierarchy = Create([new ClassificationNode("group", "01.1", "Food")]);
    StandardClassification longHierarchy = Create(
    [
      new ClassificationNode("division", "01", "Food and non-alcoholic beverages"),
      new ClassificationNode("group", "01.1", "Food"),
    ]);

    Assert.IsFalse(shortHierarchy.Equals(longHierarchy));
    Assert.IsFalse(longHierarchy.Equals(shortHierarchy));
  }

  /// <summary>
  /// Verifies classifications with identical hierarchies remain structurally equal.
  /// </summary>
  [TestMethod]
  public void Equals_HierarchiesWithSameLengthAndContent_ReturnsTrue()
  {
    StandardClassification left = Create([new ClassificationNode("group", "01.1", "Food")]);
    StandardClassification right = Create([new ClassificationNode("group", "01.1", "Food")]);

    Assert.IsTrue(left.Equals(right));
    Assert.AreEqual(left.GetHashCode(), right.GetHashCode());
  }

  private static StandardClassification Create(IReadOnlyList<ClassificationNode> hierarchy) =>
    new(
      ClassificationSystem.EcoicopV2,
      "2",
      "01.1",
      "Food",
      hierarchy,
      ClassificationOrigin.Analysis,
      0.9,
      []);
}
