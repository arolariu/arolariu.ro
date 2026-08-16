namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests the in-memory taxonomy broker against deterministic injected taxonomy artifacts.
/// </summary>
[TestClass]
public sealed class TaxonomyBrokerTests
{
  /// <summary>
  /// Verifies that resolving a known manual taxonomy code returns its canonical classification value.
  /// </summary>
  [TestMethod]
  public void Resolve_ExistingManualCode_ReturnsCanonicalManualClassification()
  {
    // Arrange
    ITaxonomyBroker broker = TaxonomyBrokerTestFactory.Create();

    // Act
    StandardClassification result = broker.Resolve(
      ClassificationSystem.EcoicopV2,
      "01.1",
      ClassificationOrigin.Manual,
      confidence: null,
      evidence: []);

    // Assert
    Assert.AreEqual("Food", result.OfficialLabel);
    Assert.AreEqual(ClassificationOrigin.Manual, result.Origin);
    Assert.IsNull(result.Confidence);
    Assert.AreEqual(2, result.Hierarchy.Count);
    Assert.AreEqual("01.1", result.Hierarchy[^1].Code);
  }

  /// <summary>
  /// Verifies that resolving an unknown taxonomy code throws the dedicated not-found exception.
  /// </summary>
  [TestMethod]
  public void Resolve_UnknownCode_ThrowsTaxonomyCodeNotFoundException() =>
    Assert.ThrowsExactly<TaxonomyCodeNotFoundException>(() =>
      TaxonomyBrokerTestFactory.Create().Resolve(
        ClassificationSystem.Nace21,
        "XX.XX",
        ClassificationOrigin.Analysis,
        0.8,
        []));

  /// <summary>
  /// Verifies that exact-code matches are ordered before label-only matches.
  /// </summary>
  [TestMethod]
  public void Search_ExactCodeQuery_PrioritizesExactMatch()
  {
    // Arrange
    ITaxonomyBroker broker = TaxonomyBrokerTestFactory.Create();

    // Act
    IReadOnlyList<TaxonomySearchResult> results =
      broker.Search(ClassificationSystem.EcoicopV2, "01.1", maximumResults: 5);

    // Assert
    Assert.AreEqual(5, results.Count);
    Assert.AreEqual("01.1", results[0].Code);
    Assert.AreEqual("Food", results[0].OfficialLabel);
  }

  /// <summary>
  /// Verifies that label-token overlap ranking surfaces the most specific match first.
  /// </summary>
  [TestMethod]
  public void Search_LabelQuery_ReturnsDescendingTokenOverlap()
  {
    // Arrange
    ITaxonomyBroker broker = TaxonomyBrokerTestFactory.Create();

    // Act
    IReadOnlyList<TaxonomySearchResult> results =
      broker.Search(ClassificationSystem.EcoicopV2, "food cereals", maximumResults: 5);

    // Assert
    Assert.AreEqual("01.1.1", results[0].Code);
    Assert.AreEqual("Cereals and cereal products (ND)", results[0].OfficialLabel);
  }

  /// <summary>
  /// Verifies that the broker caps result count at fifty even when more matches exist.
  /// </summary>
  [TestMethod]
  public void Search_MaximumResultsAboveFifty_CapsResultsAtFifty()
  {
    // Arrange
    ITaxonomyBroker broker = TaxonomyBrokerTestFactory.CreateLargeEcoicopBroker(nodeCount: 75);

    // Act
    IReadOnlyList<TaxonomySearchResult> results =
      broker.Search(ClassificationSystem.EcoicopV2, "food", maximumResults: 200);

    // Assert
    Assert.AreEqual(50, results.Count);
  }

  /// <summary>
  /// Verifies that the broker reports taxonomy-code existence for a given system.
  /// </summary>
  [TestMethod]
  public void Contains_KnownCode_ReturnsTrue()
  {
    // Arrange
    ITaxonomyBroker broker = TaxonomyBrokerTestFactory.Create();

    // Act
    bool containsCode = broker.Contains(ClassificationSystem.Gs1Gpc, "10000025");

    // Assert
    Assert.IsTrue(containsCode);
  }

  /// <summary>
  /// Verifies that constructor validation rejects taxonomy artifacts with no nodes.
  /// </summary>
  [TestMethod]
  public void Constructor_ArtifactWithEmptyNodes_ThrowsInvalidOperationException()
  {
    // Arrange
    IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem =
      TaxonomyBrokerTestFactory.CreateArtifactJsonBySystemWithEmptyNodes(ClassificationSystem.Nace21);

    // Act & Assert
    Assert.ThrowsExactly<InvalidOperationException>(() => new JsonTaxonomyBroker(artifactJsonBySystem));
  }
}
