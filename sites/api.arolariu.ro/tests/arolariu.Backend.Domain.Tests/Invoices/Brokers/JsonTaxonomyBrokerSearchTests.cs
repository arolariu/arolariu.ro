namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;
using System.Reflection;

using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests taxonomy search and embedded artifact loading branches in <see cref="JsonTaxonomyBroker"/>.
/// </summary>
[TestClass]
public sealed class JsonTaxonomyBrokerSearchTests
{
  /// <summary>
  /// Verifies that the default constructor loads embedded resources for every shipped taxonomy system.
  /// </summary>
  [TestMethod]
  public void Constructor_EmbeddedArtifacts_ResolvesKnownCodesFromEverySystem()
  {
    // Arrange
    var broker = new JsonTaxonomyBroker();

    // Act
    bool containsGpcCode = broker.Contains(ClassificationSystem.Gs1Gpc, "10000025");
    bool containsEcoicopCode = broker.Contains(ClassificationSystem.EcoicopV2, "01");
    bool containsNaceCode = broker.Contains(ClassificationSystem.Nace21, "A");

    // Assert
    Assert.IsTrue(containsGpcCode);
    Assert.IsTrue(containsEcoicopCode);
    Assert.IsTrue(containsNaceCode);
  }

  /// <summary>
  /// Verifies that search rejects whitespace-only queries before tokenization.
  /// </summary>
  [TestMethod]
  public void Search_WhitespaceQuery_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      TaxonomyBrokerTestFactory.Create().Search(ClassificationSystem.EcoicopV2, "   ", maximumResults: 5));

  /// <summary>
  /// Verifies that search rejects a non-positive maximum result count.
  /// </summary>
  /// <param name="maximumResults">The requested maximum result count.</param>
  [TestMethod]
  [DataRow(0)]
  [DataRow(-1)]
  public void Search_NonPositiveMaximumResults_ThrowsArgumentOutOfRangeException(int maximumResults) =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
      TaxonomyBrokerTestFactory.Create().Search(ClassificationSystem.EcoicopV2, "food", maximumResults));

  /// <summary>
  /// Verifies that search rejects queries that have no letter or digit tokens after trimming.
  /// </summary>
  [TestMethod]
  public void Search_QueryWithoutSearchTokens_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      TaxonomyBrokerTestFactory.Create().Search(ClassificationSystem.EcoicopV2, "---", maximumResults: 5));

  /// <summary>
  /// Verifies that search returns an empty result set when query tokens do not overlap any indexed node.
  /// </summary>
  [TestMethod]
  public void Search_NoTokenOverlap_ReturnsEmptyResults()
  {
    // Arrange
    ITaxonomyBroker broker = TaxonomyBrokerTestFactory.Create();

    // Act
    IReadOnlyList<TaxonomySearchResult> results =
      broker.Search(ClassificationSystem.EcoicopV2, "unmatchedtoken", maximumResults: 5);

    // Assert
    Assert.AreEqual(0, results.Count);
  }

  /// <summary>
  /// Verifies that search honors a caller result limit below the broker hard cap.
  /// </summary>
  [TestMethod]
  public void Search_MoreMatchesThanRequested_ReturnsRequestedMaximum()
  {
    // Arrange
    ITaxonomyBroker broker = TaxonomyBrokerTestFactory.Create();

    // Act
    IReadOnlyList<TaxonomySearchResult> results =
      broker.Search(ClassificationSystem.EcoicopV2, "food", maximumResults: 2);

    // Assert
    Assert.AreEqual(2, results.Count);
  }

  /// <summary>
  /// Verifies that full token overlap ranks an exact multi-token label match first.
  /// </summary>
  [TestMethod]
  public void Search_FullTokenOverlap_ReturnsBestMatchingResultFirst()
  {
    // Arrange
    ITaxonomyBroker broker = TaxonomyBrokerTestFactory.Create();

    // Act
    IReadOnlyList<TaxonomySearchResult> results =
      broker.Search(ClassificationSystem.EcoicopV2, "flours other cereals", maximumResults: 5);

    // Assert
    Assert.AreEqual("01.1.1.2", results[0].Code);
  }

  /// <summary>
  /// Verifies that hierarchy building reports a missing indexed hierarchy node.
  /// </summary>
  [TestMethod]
  public void BuildHierarchy_MissingIndexedHierarchyNode_ThrowsInvalidOperationException()
  {
    // Arrange
    var broker = (JsonTaxonomyBroker)TaxonomyBrokerTestFactory.Create();
    var node = new TaxonomyArtifactNode
    {
      Code = "99",
      OfficialLabel = "Synthetic node",
      Level = "class",
      ParentCode = null,
      HierarchyCodes = ["99"],
      HierarchyLabels = ["Synthetic node"],
      Definition = null,
      SearchText = "synthetic node",
      NormalizedCode = "99"
    };
    MethodInfo method = typeof(JsonTaxonomyBroker).GetMethod(
      "BuildHierarchy",
      BindingFlags.Instance | BindingFlags.NonPublic)
      ?? throw new AssertFailedException("BuildHierarchy method was not found.");

    // Act
    TargetInvocationException exception = Assert.ThrowsExactly<TargetInvocationException>(() =>
      _ = method.Invoke(broker, [ClassificationSystem.EcoicopV2, node]));

    // Assert
    Assert.IsInstanceOfType<InvalidOperationException>(exception.InnerException);
  }
}
