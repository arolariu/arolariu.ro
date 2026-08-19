namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Tests taxonomy broker search, resolution, and validation.</summary>
[TestClass]
public sealed class TaxonomyBrokerTests
{
  /// <summary>Verifies exact code search ranks first and resolves trusted data.</summary>
  [TestMethod]
  public void SearchAndResolve_ValidArtifacts_ReturnCanonicalValues()
  {
    var broker = new JsonTaxonomyBroker(CreateArtifacts());

    IReadOnlyList<TaxonomySearchResult> results = broker.Search(
      ClassificationSystem.EcoicopV2,
      "01.1",
      10);
    StandardClassification classification = broker.Resolve(
      ClassificationSystem.EcoicopV2,
      "01.1",
      ClassificationOrigin.Manual,
      null,
      []);

    Assert.AreEqual("01.1", results[0].Code);
    Assert.AreEqual("Food products 1", classification.OfficialLabel);
    Assert.AreEqual("2", classification.Version);
    Assert.IsTrue(broker.Contains(ClassificationSystem.EcoicopV2, "01.1"));
  }

  /// <summary>Verifies result counts are capped at fifty.</summary>
  [TestMethod]
  public void Search_ExcessiveLimit_CapsAtFifty()
  {
    var broker = new JsonTaxonomyBroker(CreateArtifacts(60));

    IReadOnlyList<TaxonomySearchResult> results =
      broker.Search(ClassificationSystem.EcoicopV2, "food", 500);

    Assert.AreEqual(50, results.Count);
  }

  /// <summary>Verifies query tokens use the same diacritic normalization as artifacts.</summary>
  [TestMethod]
  public void Search_DiacriticQuery_MatchesNormalizedArtifactTokens()
  {
    var artifacts = new Dictionary<ClassificationSystem, string>(CreateArtifacts())
    {
      [ClassificationSystem.Gs1Gpc] = JsonSerializer.Serialize(new
      {
        system = "GS1_GPC",
        version = "2026-05",
        sourceUrl = "https://example.test",
        generatedAt = "2026-08-19T00:00:00Z",
        attribution = "Test",
        nodes = new[]
        {
          Node("100", "Creme dessert", "brick", null, ["100"], ["Creme dessert"])
        }
      })
    };
    var broker = new JsonTaxonomyBroker(artifacts);

    IReadOnlyList<TaxonomySearchResult> results =
      broker.Search(ClassificationSystem.Gs1Gpc, "crème", 5);

    Assert.AreEqual("100", results[0].Code);
  }

  /// <summary>Verifies unknown codes throw the classification-owned exception.</summary>
  [TestMethod]
  public void Resolve_UnknownCode_ThrowsTaxonomyCodeNotFoundException()
  {
    var broker = new JsonTaxonomyBroker(CreateArtifacts());

    Assert.ThrowsExactly<TaxonomyCodeNotFoundException>(() => broker.Resolve(
      ClassificationSystem.Nace21,
      "missing",
      ClassificationOrigin.Manual,
      null,
      []));
  }

  /// <summary>Verifies all supported systems are required.</summary>
  [TestMethod]
  public void Constructor_MissingSystem_ThrowsArgumentException()
  {
    var artifacts = new Dictionary<ClassificationSystem, string>(CreateArtifacts());
    _ = artifacts.Remove(ClassificationSystem.Nace21);

    Assert.ThrowsExactly<ArgumentException>(() => new JsonTaxonomyBroker(artifacts));
  }

  /// <summary>Verifies hierarchy labels must match canonical referenced nodes.</summary>
  [TestMethod]
  public void Constructor_MismatchedHierarchyLabel_ThrowsInvalidOperationException()
  {
    var artifacts = new Dictionary<ClassificationSystem, string>(CreateArtifacts())
    {
      [ClassificationSystem.EcoicopV2] = JsonSerializer.Serialize(new
      {
        system = "ECOICOP_V2",
        version = "2",
        sourceUrl = "https://example.test",
        generatedAt = "2026-08-19T00:00:00Z",
        attribution = "Test",
        nodes = new object[]
        {
          Node("01", "Food", "division", null, ["01"], ["Food"]),
          Node("01.1", "Food products", "group", "01", ["01", "01.1"], ["Wrong label", "Food products"])
        }
      })
    };

    Assert.ThrowsExactly<InvalidOperationException>(() => new JsonTaxonomyBroker(artifacts));
  }

  /// <summary>Verifies the production constructor loads all embedded artifacts.</summary>
  [TestMethod]
  public void Constructor_Parameterless_LoadsEmbeddedArtifactsForAllSystems()
  {
    var broker = new JsonTaxonomyBroker();

    foreach (ClassificationSystem system in Enum.GetValues<ClassificationSystem>())
      Assert.IsFalse(string.IsNullOrWhiteSpace(broker.GetArtifactVersion(system)));
  }

  private static Dictionary<ClassificationSystem, string> CreateArtifacts(int ecoicopNodeCount = 2) =>
    new Dictionary<ClassificationSystem, string>
    {
      [ClassificationSystem.Gs1Gpc] = CreateArtifact("GS1_GPC", "2026-05", "100", "Bread"),
      [ClassificationSystem.EcoicopV2] = CreateEcoicopArtifact(ecoicopNodeCount),
      [ClassificationSystem.Nace21] = CreateArtifact("NACE_2_1", "2.1", "A", "Agriculture"),
    };

  private static string CreateEcoicopArtifact(int nodeCount)
  {
    var nodes = new List<object>
    {
      Node("01", "Food", "division", null, ["01"], ["Food"])
    };
    for (int index = 1; index < nodeCount; index++)
    {
      string code = $"01.{index}";
      nodes.Add(Node(code, $"Food products {index}", "group", "01", ["01", code], ["Food", $"Food products {index}"]));
    }

    return JsonSerializer.Serialize(new
    {
      system = "ECOICOP_V2",
      version = "2",
      sourceUrl = "https://example.test",
      generatedAt = "2026-08-19T00:00:00Z",
      attribution = "Test",
      nodes
    });
  }

  private static string CreateArtifact(string system, string version, string code, string label) =>
    JsonSerializer.Serialize(new
    {
      system,
      version,
      sourceUrl = "https://example.test",
      generatedAt = "2026-08-19T00:00:00Z",
      attribution = "Test",
      nodes = new[] { Node(code, label, "root", null, [code], [label]) }
    });

  private static object Node(
    string code,
    string label,
    string level,
    string? parentCode,
    string[] hierarchyCodes,
    string[] hierarchyLabels) =>
    new
    {
      code,
      officialLabel = label,
      level,
      parentCode,
      hierarchyCodes,
      hierarchyLabels,
      definition = (string?)null,
      searchText = $"{code} {label}".ToUpperInvariant()
    };
}
