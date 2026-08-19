namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects;

using System;
using System.Collections.Generic;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies classification invariants, structural equality, and strict JSON contracts.
/// </summary>
/// <remarks>
/// The fixture exercises both domain construction rules and the externally persisted
/// enum wire names without documenting each assertion as a separate API contract.
/// </remarks>
[TestClass]
public sealed class ClassificationValueObjectTests
{
  /// <summary>Verifies immutable snapshots and valid analysis confidence.</summary>
  [TestMethod]
  public void StandardClassification_ValidAnalysisInput_CreatesSnapshot()
  {
    var hierarchy = new List<ClassificationNode>
    {
      new("division", "01", "Food"),
      new("group", "01.1", "Food products")
    };
    var evidence = new List<ClassificationEvidence> { new("product.name", "bread") };

    var classification = new StandardClassification(
      ClassificationSystem.EcoicopV2,
      "2",
      "01.1",
      "Food products",
      hierarchy,
      ClassificationOrigin.Analysis,
      0.9,
      evidence);

    hierarchy.Clear();
    evidence.Clear();

    Assert.HasCount(2, classification.Hierarchy);
    Assert.HasCount(1, classification.Evidence);
  }

  /// <summary>Verifies manual classifications reject confidence.</summary>
  [TestMethod]
  public void StandardClassification_ManualWithConfidence_Throws() =>
    Assert.ThrowsExactly<ArgumentException>(() => new StandardClassification(
      ClassificationSystem.Nace21,
      "2.1",
      "A",
      "Agriculture",
      [new ClassificationNode("section", "A", "Agriculture")],
      ClassificationOrigin.Manual,
      0.5,
      []));

  /// <summary>Verifies analysis classifications require confidence.</summary>
  [TestMethod]
  public void StandardClassification_AnalysisWithoutConfidence_Throws() =>
    Assert.ThrowsExactly<ArgumentException>(() => new StandardClassification(
      ClassificationSystem.Nace21,
      "2.1",
      "A",
      "Agriculture",
      [new ClassificationNode("section", "A", "Agriculture")],
      ClassificationOrigin.Analysis,
      null,
      []));

  /// <summary>Verifies hierarchy terminal code validation.</summary>
  [TestMethod]
  public void StandardClassification_MismatchedHierarchy_Throws() =>
    Assert.ThrowsExactly<ArgumentException>(() => new StandardClassification(
      ClassificationSystem.Nace21,
      "2.1",
      "01",
      "Production",
      [new ClassificationNode("section", "A", "Agriculture")],
      ClassificationOrigin.Analysis,
      0.7,
      []));

  /// <summary>Verifies structural equality and hashing.</summary>
  [TestMethod]
  public void StandardClassification_EquivalentValues_AreEqual()
  {
    StandardClassification first = CreateClassification();
    StandardClassification second = CreateClassification();

    Assert.AreEqual(first, second);
    Assert.AreEqual(first.GetHashCode(), second.GetHashCode());
  }

  /// <summary>Verifies strict wire names for classification systems.</summary>
  [TestMethod]
  [DataRow(ClassificationSystem.Gs1Gpc, "\"GS1_GPC\"")]
  [DataRow(ClassificationSystem.EcoicopV2, "\"ECOICOP_V2\"")]
  [DataRow(ClassificationSystem.Nace21, "\"NACE_2_1\"")]
  public void ClassificationSystem_Serialize_WritesWireName(
    ClassificationSystem value,
    string expectedJson) =>
    Assert.AreEqual(expectedJson, JsonSerializer.Serialize(value));

  /// <summary>Verifies unknown strings and numeric values are rejected.</summary>
  [TestMethod]
  public void ClassificationSystem_InvalidJson_Throws()
  {
    Assert.ThrowsExactly<JsonException>(() => JsonSerializer.Deserialize<ClassificationSystem>("\"UNKNOWN\""));
    Assert.ThrowsExactly<JsonException>(() => JsonSerializer.Deserialize<ClassificationSystem>("1"));
  }

  /// <summary>
  /// Creates a stable analysis classification for structural equality assertions.
  /// </summary>
  /// <returns>A fully validated classification with hierarchy and evidence.</returns>
  private static StandardClassification CreateClassification() =>
    new(
      ClassificationSystem.EcoicopV2,
      "2",
      "01",
      "Food",
      [new ClassificationNode("division", "01", "Food")],
      ClassificationOrigin.Analysis,
      0.9,
      [new ClassificationEvidence("product.name", "bread")]);
}
