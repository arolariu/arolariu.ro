namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests compiler-generated and validation behavior for <see cref="TaxonomySearchResult"/>.
/// </summary>
[TestClass]
public sealed class TaxonomySearchResultTests
{
  /// <summary>
  /// Verifies that identical search result records compare equal and produce consistent hash codes.
  /// </summary>
  [TestMethod]
  public void Equals_IdenticalValues_ReturnsTrueAndConsistentHashCode()
  {
    // Arrange
    TaxonomySearchResult first = CreateResult("01.1", "Food");
    TaxonomySearchResult second = first with { };

    // Act
    bool areEqual = first == second;
    int firstHashCode = first.GetHashCode();
    int secondHashCode = second.GetHashCode();

    // Assert
    Assert.IsTrue(areEqual);
    Assert.AreEqual(firstHashCode, secondHashCode);
  }

  /// <summary>
  /// Verifies that different search result records do not compare equal.
  /// </summary>
  [TestMethod]
  public void Equals_DifferentValues_ReturnsFalse()
  {
    // Arrange
    TaxonomySearchResult first = CreateResult("01.1", "Food");
    TaxonomySearchResult second = CreateResult("01.2", "Beverages");

    // Act
    bool areEqual = first == second;

    // Assert
    Assert.IsFalse(areEqual);
  }

  /// <summary>
  /// Verifies that search result equality handles null and unrelated object comparisons.
  /// </summary>
  [TestMethod]
  public void Equals_NullAndDifferentType_ReturnsFalse()
  {
    // Arrange
    TaxonomySearchResult result = CreateResult("01.1", "Food");
    TaxonomySearchResult? missing = null;
    object boxed = result;

    // Act
    bool equalsNull = result.Equals(missing);
    bool equalsDifferentType = boxed.Equals("not a search result");

    // Assert
    Assert.IsFalse(equalsNull);
    Assert.IsFalse(equalsDifferentType);
  }

  /// <summary>
  /// Verifies that a with-expression copy preserves record equality while creating a distinct instance.
  /// </summary>
  [TestMethod]
  public void WithExpression_Copy_ReturnsEqualDistinctInstance()
  {
    // Arrange
    TaxonomySearchResult original = CreateResult("01.1", "Food");

    // Act
    TaxonomySearchResult copied = original with { };

    // Assert
    Assert.AreEqual(original, copied);
    Assert.AreNotSame(original, copied);
  }

  /// <summary>
  /// Verifies that the generated string representation contains useful record content.
  /// </summary>
  [TestMethod]
  public void ToString_ValidResult_ReturnsNonEmptyRecordText()
  {
    // Arrange
    TaxonomySearchResult result = CreateResult("01.1", "Food");

    // Act
    string text = result.ToString();

    // Assert
    Assert.IsFalse(string.IsNullOrWhiteSpace(text));
    StringAssert.Contains(text, nameof(TaxonomySearchResult), StringComparison.Ordinal);
    StringAssert.Contains(text, "01.1", StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies that constructor validation rejects a null hierarchy collection.
  /// </summary>
  [TestMethod]
  public void Constructor_NullHierarchy_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() =>
      new TaxonomySearchResult(ClassificationSystem.EcoicopV2, "2", "01.1", "Food", null!));

  /// <summary>
  /// Verifies that constructor validation rejects an empty hierarchy collection.
  /// </summary>
  [TestMethod]
  public void Constructor_EmptyHierarchy_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      new TaxonomySearchResult(ClassificationSystem.EcoicopV2, "2", "01.1", "Food", []));

  /// <summary>
  /// Verifies that constructor validation rejects a hierarchy that does not end at the selected code.
  /// </summary>
  [TestMethod]
  public void Constructor_HierarchyEndingAtDifferentCode_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      new TaxonomySearchResult(
        ClassificationSystem.EcoicopV2,
        "2",
        "01.1",
        "Food",
        [new ClassificationNode("division", "01", "Food and non-alcoholic beverages")]));

  private static TaxonomySearchResult CreateResult(string code, string officialLabel) =>
    new(
      ClassificationSystem.EcoicopV2,
      "2",
      code,
      officialLabel,
      CreateHierarchy(code, officialLabel));

  private static IReadOnlyList<ClassificationNode> CreateHierarchy(string code, string officialLabel) =>
  [
    new ClassificationNode("division", "01", "Food and non-alcoholic beverages"),
    new ClassificationNode("group", code, officialLabel)
  ];
}
