namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests taxonomy artifact validation branches in <see cref="JsonTaxonomyBroker"/>.
/// </summary>
[TestClass]
public sealed class JsonTaxonomyBrokerValidationTests
{
  /// <summary>
  /// Verifies that the injected-artifact constructor rejects a null artifact map.
  /// </summary>
  [TestMethod]
  public void Constructor_NullArtifactMap_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() => new JsonTaxonomyBroker(null!));

  /// <summary>
  /// Verifies that constructor validation rejects an artifact map missing a supported classification system.
  /// </summary>
  [TestMethod]
  public void Constructor_MissingSupportedSystem_ThrowsArgumentException()
  {
    // Arrange
    var artifactJsonBySystem = new Dictionary<ClassificationSystem, string>(
      TaxonomyBrokerTestFactory.CreateArtifactJsonBySystem());
    _ = artifactJsonBySystem.Remove(ClassificationSystem.Nace21);

    // Act & Assert
    Assert.ThrowsExactly<ArgumentException>(() => new JsonTaxonomyBroker(artifactJsonBySystem));
  }

  /// <summary>
  /// Verifies that constructor validation rejects a null artifact JSON payload.
  /// </summary>
  [TestMethod]
  public void Constructor_NullArtifactJson_ThrowsArgumentNullException()
  {
    // Arrange
    IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem = ReplaceEcoicopArtifact(null!);

    // Act & Assert
    Assert.ThrowsExactly<ArgumentNullException>(() => new JsonTaxonomyBroker(artifactJsonBySystem));
  }

  /// <summary>
  /// Verifies that constructor validation rejects empty artifact JSON payloads.
  /// </summary>
  /// <param name="artifactJson">The invalid artifact JSON payload.</param>
  [TestMethod]
  [DataRow("")]
  [DataRow("   ")]
  public void Constructor_BlankArtifactJson_ThrowsArgumentException(string artifactJson)
  {
    // Arrange
    IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem = ReplaceEcoicopArtifact(artifactJson);

    // Act & Assert
    Assert.ThrowsExactly<ArgumentException>(() => new JsonTaxonomyBroker(artifactJsonBySystem));
  }

  /// <summary>
  /// Verifies that constructor validation rejects JSON that deserializes to a null artifact envelope.
  /// </summary>
  [TestMethod]
  public void Constructor_NullArtifactEnvelope_ThrowsInvalidOperationException()
  {
    // Arrange
    IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem = ReplaceEcoicopArtifact("null");

    // Act & Assert
    Assert.ThrowsExactly<InvalidOperationException>(() => new JsonTaxonomyBroker(artifactJsonBySystem));
  }

  /// <summary>
  /// Verifies that constructor validation rejects an artifact envelope with the wrong declared system.
  /// </summary>
  [TestMethod]
  public void Constructor_WrongArtifactSystem_ThrowsInvalidOperationException()
  {
    // Arrange
    string artifactJson = CreateArtifactJson(
      "WRONG_SYSTEM",
      "2",
      "https://example.test/ecoicop",
      "Test ECOICOP artifact",
      ValidEcoicopNodes());
    IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem = ReplaceEcoicopArtifact(artifactJson);

    // Act & Assert
    Assert.ThrowsExactly<InvalidOperationException>(() => new JsonTaxonomyBroker(artifactJsonBySystem));
  }

  /// <summary>
  /// Verifies that constructor validation rejects blank required artifact envelope text fields.
  /// </summary>
  /// <param name="version">The declared version value.</param>
  /// <param name="sourceLocation">The declared source URL value.</param>
  /// <param name="attribution">The declared attribution value.</param>
  [TestMethod]
  [DataRow(" ", "https://example.test/ecoicop", "Test ECOICOP artifact")]
  [DataRow("2", " ", "Test ECOICOP artifact")]
  [DataRow("2", "https://example.test/ecoicop", " ")]
  public void Constructor_BlankArtifactEnvelopeText_ThrowsArgumentException(
    string version,
    string sourceLocation,
    string attribution)
  {
    // Arrange
    string artifactJson = CreateArtifactJson("ECOICOP_V2", version, sourceLocation, attribution, ValidEcoicopNodes());
    IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem = ReplaceEcoicopArtifact(artifactJson);

    // Act & Assert
    Assert.ThrowsExactly<ArgumentException>(() => new JsonTaxonomyBroker(artifactJsonBySystem));
  }

  /// <summary>
  /// Verifies that constructor validation rejects an artifact envelope whose nodes collection is null.
  /// </summary>
  [TestMethod]
  public void Constructor_NullNodesCollection_ThrowsArgumentNullException()
  {
    // Arrange
    string artifactJson = JsonSerializer.Serialize(new
    {
      system = "ECOICOP_V2",
      version = "2",
      sourceUrl = "https://example.test/ecoicop",
      generatedAt = "2026-08-16T14:09:17.303Z",
      attribution = "Test ECOICOP artifact",
      nodes = (object[]?)null
    });
    IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem = ReplaceEcoicopArtifact(artifactJson);

    // Act & Assert
    Assert.ThrowsExactly<ArgumentNullException>(() => new JsonTaxonomyBroker(artifactJsonBySystem));
  }

  /// <summary>
  /// Verifies that constructor validation rejects malformed taxonomy node fields.
  /// </summary>
  /// <param name="code">The node code value.</param>
  /// <param name="officialLabel">The official label value.</param>
  /// <param name="level">The hierarchy level value.</param>
  /// <param name="searchText">The search text value.</param>
  [TestMethod]
  [DataRow(" ", "Food and non-alcoholic beverages", "division", "food")]
  [DataRow("01", " ", "division", "food")]
  [DataRow("01", "Food and non-alcoholic beverages", " ", "food")]
  [DataRow("01", "Food and non-alcoholic beverages", "division", " ")]
  public void Constructor_InvalidNodeText_ThrowsArgumentException(
    string code,
    string officialLabel,
    string level,
    string searchText)
  {
    // Arrange
    object[] nodes =
    [
      Node(
        code,
        officialLabel,
        level,
        parentCode: null,
        hierarchyCodes: [code],
        hierarchyLabels: [officialLabel],
        searchText)
    ];
    IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem =
      ReplaceEcoicopArtifact(CreateEcoicopArtifactJson(nodes));

    // Act & Assert
    Assert.ThrowsExactly<ArgumentException>(() => new JsonTaxonomyBroker(artifactJsonBySystem));
  }

  /// <summary>
  /// Verifies that constructor validation rejects null hierarchy arrays.
  /// </summary>
  [TestMethod]
  public void Constructor_NullHierarchyValuesCollection_ThrowsArgumentNullException()
  {
    // Arrange
    object[] nodes =
    [
      Node(
        code: "01",
        officialLabel: "Food and non-alcoholic beverages",
        level: "division",
        parentCode: null,
        hierarchyCodes: null,
        hierarchyLabels: ["Food and non-alcoholic beverages"],
        searchText: "food")
    ];
    IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem =
      ReplaceEcoicopArtifact(CreateEcoicopArtifactJson(nodes));

    // Act & Assert
    Assert.ThrowsExactly<ArgumentNullException>(() => new JsonTaxonomyBroker(artifactJsonBySystem));
  }

  /// <summary>
  /// Verifies that constructor validation rejects empty hierarchy arrays.
  /// </summary>
  [TestMethod]
  public void Constructor_EmptyHierarchyValuesCollection_ThrowsInvalidOperationException()
  {
    // Arrange
    object[] nodes =
    [
      Node(
        code: "01",
        officialLabel: "Food and non-alcoholic beverages",
        level: "division",
        parentCode: null,
        hierarchyCodes: [],
        hierarchyLabels: ["Food and non-alcoholic beverages"],
        searchText: "food")
    ];
    IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem =
      ReplaceEcoicopArtifact(CreateEcoicopArtifactJson(nodes));

    // Act & Assert
    Assert.ThrowsExactly<InvalidOperationException>(() => new JsonTaxonomyBroker(artifactJsonBySystem));
  }

  /// <summary>
  /// Verifies that constructor validation rejects whitespace hierarchy values.
  /// </summary>
  [TestMethod]
  public void Constructor_WhitespaceHierarchyValue_ThrowsArgumentException()
  {
    // Arrange
    object[] nodes =
    [
      Node(
        code: "01",
        officialLabel: "Food and non-alcoholic beverages",
        level: "division",
        parentCode: null,
        hierarchyCodes: [" "],
        hierarchyLabels: ["Food and non-alcoholic beverages"],
        searchText: "food")
    ];
    IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem =
      ReplaceEcoicopArtifact(CreateEcoicopArtifactJson(nodes));

    // Act & Assert
    Assert.ThrowsExactly<ArgumentException>(() => new JsonTaxonomyBroker(artifactJsonBySystem));
  }

  /// <summary>
  /// Verifies that constructor validation rejects duplicate normalized taxonomy codes.
  /// </summary>
  [TestMethod]
  public void Constructor_DuplicateNormalizedCodes_ThrowsInvalidOperationException()
  {
    // Arrange
    object[] nodes =
    [
      Node("01", "Food and non-alcoholic beverages", "division", null, ["01"], ["Food and non-alcoholic beverages"], "food"),
      Node("01", "Duplicate food", "division", null, ["01"], ["Duplicate food"], "duplicate food")
    ];
    IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem =
      ReplaceEcoicopArtifact(CreateEcoicopArtifactJson(nodes));

    // Act & Assert
    Assert.ThrowsExactly<InvalidOperationException>(() => new JsonTaxonomyBroker(artifactJsonBySystem));
  }

  /// <summary>
  /// Verifies that constructor validation rejects inconsistent hierarchy relationships.
  /// </summary>
  /// <param name="caseName">The validation case name.</param>
  [TestMethod]
  [DataRow("mismatched-hierarchy-arrays")]
  [DataRow("terminal-code-mismatch")]
  [DataRow("missing-parent")]
  [DataRow("missing-hierarchy-code")]
  public void Constructor_InvalidHierarchyRelationships_ThrowsInvalidOperationException(string caseName)
  {
    // Arrange
    object[] nodes = caseName switch
    {
      "mismatched-hierarchy-arrays" =>
      [
        Node("01", "Food and non-alcoholic beverages", "division", null, ["01"], ["Food", "Extra"], "food")
      ],
      "terminal-code-mismatch" =>
      [
        Node("01", "Food and non-alcoholic beverages", "division", null, ["02"], ["Food and non-alcoholic beverages"], "food")
      ],
      "missing-parent" =>
      [
        Node("01.1", "Food", "group", "01", ["01.1"], ["Food"], "food")
      ],
      "missing-hierarchy-code" =>
      [
        Node("01", "Food and non-alcoholic beverages", "division", null, ["99", "01"], ["Missing", "Food and non-alcoholic beverages"], "food")
      ],
      _ => throw new ArgumentOutOfRangeException(nameof(caseName), caseName, "Unsupported hierarchy case.")
    };
    IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem =
      ReplaceEcoicopArtifact(CreateEcoicopArtifactJson(nodes));

    // Act & Assert
    Assert.ThrowsExactly<InvalidOperationException>(() => new JsonTaxonomyBroker(artifactJsonBySystem));
  }

  private static Dictionary<ClassificationSystem, string> ReplaceEcoicopArtifact(string artifactJson)
  {
    var artifactJsonBySystem = new Dictionary<ClassificationSystem, string>(
      TaxonomyBrokerTestFactory.CreateArtifactJsonBySystem())
    {
      [ClassificationSystem.EcoicopV2] = artifactJson
    };

    return artifactJsonBySystem;
  }

  private static string CreateEcoicopArtifactJson(object[] nodes) =>
    CreateArtifactJson(
      system: "ECOICOP_V2",
      version: "2",
      sourceLocation: "https://example.test/ecoicop",
      attribution: "Test ECOICOP artifact",
      nodes);

  private static string CreateArtifactJson(
    string system,
    string version,
    string sourceLocation,
    string attribution,
    object[] nodes) =>
    JsonSerializer.Serialize(new
    {
      system,
      version,
      sourceUrl = sourceLocation,
      generatedAt = "2026-08-16T14:09:17.303Z",
      attribution,
      nodes
    });

  private static object[] ValidEcoicopNodes() =>
  [
    Node("01", "Food and non-alcoholic beverages", "division", null, ["01"], ["Food and non-alcoholic beverages"], "food")
  ];

  private static object Node(
    string code,
    string officialLabel,
    string level,
    string? parentCode,
    string[]? hierarchyCodes,
    string[]? hierarchyLabels,
    string searchText) =>
    new
    {
      code,
      officialLabel,
      level,
      parentCode,
      hierarchyCodes,
      hierarchyLabels,
      definition = (string?)null,
      searchText
    };
}
