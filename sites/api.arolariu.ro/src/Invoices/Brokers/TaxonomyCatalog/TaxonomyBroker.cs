namespace arolariu.Backend.Domain.Invoices.Brokers.TaxonomyCatalog;

using System;
using System.Collections.Frozen;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions;

/// <summary>Provides an in-memory taxonomy catalog backed by generated JSON artifacts.</summary>
public sealed partial class TaxonomyBroker : ITaxonomyBroker
{
  private const int MaximumSearchResultLimit = 50;
  private static readonly FrozenDictionary<ClassificationSystem, string> ArtifactFiles =
    new Dictionary<ClassificationSystem, string>
    {
      [ClassificationSystem.Gs1Gpc] = "gpc-2026-05.min.json",
      [ClassificationSystem.EcoicopV2] = "ecoicop-v2.min.json",
      [ClassificationSystem.Nace21] = "nace-2.1.min.json",
    }.ToFrozenDictionary();
  private static readonly FrozenDictionary<ClassificationSystem, string> ExpectedSystems =
    new Dictionary<ClassificationSystem, string>
    {
      [ClassificationSystem.Gs1Gpc] = "GS1_GPC",
      [ClassificationSystem.EcoicopV2] = "ECOICOP_V2",
      [ClassificationSystem.Nace21] = "NACE_2_1",
    }.ToFrozenDictionary();

  private readonly FrozenDictionary<ClassificationSystem, TaxonomyArtifact> artifacts;
  private readonly FrozenDictionary<(ClassificationSystem System, string Code), TaxonomyArtifactNode> nodesByCode;

  /// <summary>Initializes the broker from embedded resources.</summary>
  public TaxonomyBroker() : this(LoadEmbeddedArtifacts()) { }

  /// <summary>Initializes the broker from injected JSON artifacts.</summary>
  public TaxonomyBroker(IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem)
  {
    ArgumentNullException.ThrowIfNull(artifactJsonBySystem);
    foreach (ClassificationSystem system in Enum.GetValues<ClassificationSystem>())
      if (!artifactJsonBySystem.ContainsKey(system))
        throw new ArgumentException($"Missing taxonomy artifact for '{system}'.", nameof(artifactJsonBySystem));

    KeyValuePair<ClassificationSystem, TaxonomyArtifact>[] loaded = Enum.GetValues<ClassificationSystem>()
      .Select(system => KeyValuePair.Create(system, Deserialize(system, artifactJsonBySystem[system])))
      .ToArray();
    artifacts = loaded.ToFrozenDictionary();
    nodesByCode = loaded
      .SelectMany(item => item.Value.Nodes.Select(node =>
        KeyValuePair.Create((item.Key, node.NormalizedCode), node)))
      .ToFrozenDictionary();
  }

  /// <inheritdoc />
  public string GetArtifactVersion(ClassificationSystem system) => artifacts[system].Version;

  /// <inheritdoc />
  public IReadOnlyList<TaxonomySearchResult> Search(ClassificationSystem system, string query, int maximumResults)
  {
    string text = ClassificationContracts.RequireText(query, nameof(query));
    if (maximumResults <= 0)
      throw new ArgumentOutOfRangeException(nameof(maximumResults), maximumResults, "Maximum results must be positive.");
    FrozenSet<string> tokens = Tokenize(text);
    if (tokens.Count == 0) throw new ArgumentException("Search query must contain a letter or digit.", nameof(query));
    string code = NormalizeCode(text);

    TaxonomySearchResult[] results = artifacts[system].Nodes
      .Select(node => new
      {
        Node = node,
        Exact = string.Equals(node.NormalizedCode, code, StringComparison.Ordinal),
        Overlap = tokens.Count(token => node.SearchTokens.Contains(token)),
      })
      .Where(candidate => candidate.Exact || candidate.Overlap > 0)
      .OrderByDescending(candidate => candidate.Exact)
      .ThenByDescending(candidate => candidate.Overlap)
      .ThenBy(candidate => candidate.Node.Code, StringComparer.Ordinal)
      .Take(Math.Min(maximumResults, MaximumSearchResultLimit))
      .Select(candidate => CreateSearchResult(system, artifacts[system].Version, candidate.Node))
      .ToArray();
    return Array.AsReadOnly(results);
  }

  /// <inheritdoc />
  public StandardClassification Resolve(
    ClassificationSystem system,
    string code,
    ClassificationOrigin origin,
    double? confidence,
    IReadOnlyList<ClassificationEvidence> evidence)
  {
    string normalizedCode = NormalizeCode(ClassificationContracts.RequireText(code, nameof(code)));
    if (!nodesByCode.TryGetValue((system, normalizedCode), out TaxonomyArtifactNode? node))
      throw new TaxonomyCodeNotFoundException(system, code);
    TaxonomyArtifact artifact = artifacts[system];
    return new StandardClassification(
      system,
      artifact.Version,
      node.Code,
      node.OfficialLabel,
      BuildHierarchy(system, node),
      origin,
      confidence,
      evidence);
  }

  /// <inheritdoc />
  public bool Contains(ClassificationSystem system, string code) =>
    nodesByCode.ContainsKey((system, NormalizeCode(ClassificationContracts.RequireText(code, nameof(code)))));

  private static TaxonomyArtifact Deserialize(ClassificationSystem system, string json)
  {
    TaxonomyArtifact artifact = JsonSerializer.Deserialize(
      ClassificationContracts.RequireText(json, nameof(json)),
      TaxonomyArtifactJsonSerializerContext.Default.TaxonomyArtifact)
      ?? throw new InvalidOperationException($"Failed to deserialize taxonomy artifact for '{system}'.");
    if (!string.Equals(artifact.System, ExpectedSystems[system], StringComparison.Ordinal))
      throw new InvalidOperationException($"Taxonomy artifact for '{system}' declared system '{artifact.System}'.");
    _ = ClassificationContracts.RequireText(artifact.Version, nameof(artifact.Version));
    _ = ClassificationContracts.RequireText(artifact.SourceUrl, nameof(artifact.SourceUrl));
    _ = ClassificationContracts.RequireText(artifact.Attribution, nameof(artifact.Attribution));
    if (artifact.Nodes is null || artifact.Nodes.Length == 0)
      throw new InvalidOperationException($"Taxonomy artifact for '{system}' must contain nodes.");

    var indexed = new Dictionary<string, TaxonomyArtifactNode>(StringComparer.Ordinal);
    foreach (TaxonomyArtifactNode raw in artifact.Nodes)
    {
      string nodeCode = ClassificationContracts.RequireText(raw.Code, nameof(raw.Code));
      TaxonomyArtifactNode node = raw with
      {
        Code = nodeCode,
        OfficialLabel = ClassificationContracts.RequireText(raw.OfficialLabel, nameof(raw.OfficialLabel)),
        Level = ClassificationContracts.RequireText(raw.Level, nameof(raw.Level)),
        SearchText = ClassificationContracts.RequireText(raw.SearchText, nameof(raw.SearchText)),
        ParentCode = string.IsNullOrWhiteSpace(raw.ParentCode) ? null : raw.ParentCode.Trim(),
        HierarchyCodes = ValidateHierarchy(raw.HierarchyCodes),
        HierarchyLabels = ValidateHierarchy(raw.HierarchyLabels),
        NormalizedCode = NormalizeCode(nodeCode),
        SearchTokens = Tokenize(raw.SearchText),
      };
      if (!indexed.TryAdd(node.NormalizedCode, node))
        throw new InvalidOperationException($"Duplicate taxonomy code '{node.Code}' for '{system}'.");
    }

    ValidateHierarchy(system, indexed);
    return artifact with { Nodes = indexed.Values.ToArray() };
  }

  private static string[] ValidateHierarchy(string[] values)
  {
    ArgumentNullException.ThrowIfNull(values);
    if (values.Length == 0) throw new InvalidOperationException("Taxonomy hierarchy must not be empty.");
    return values.Select(value => ClassificationContracts.RequireText(value, nameof(values))).ToArray();
  }

  private static void ValidateHierarchy(
    ClassificationSystem system,
    Dictionary<string, TaxonomyArtifactNode> nodes)
  {
    foreach (TaxonomyArtifactNode node in nodes.Values)
    {
      if (node.HierarchyCodes.Length != node.HierarchyLabels.Length)
        throw new InvalidOperationException($"Taxonomy artifact for '{system}' has mismatched hierarchy arrays for '{node.Code}'.");
      if (!string.Equals(NormalizeCode(node.HierarchyCodes[^1]), node.NormalizedCode, StringComparison.Ordinal))
        throw new InvalidOperationException($"Taxonomy hierarchy for '{node.Code}' does not end with the node.");
      if (node.ParentCode is not null && !nodes.ContainsKey(NormalizeCode(node.ParentCode)))
        throw new InvalidOperationException($"Taxonomy parent '{node.ParentCode}' for '{node.Code}' was not found.");
      foreach (string hierarchyCode in node.HierarchyCodes)
        if (!nodes.ContainsKey(NormalizeCode(hierarchyCode)))
          throw new InvalidOperationException($"Taxonomy hierarchy code '{hierarchyCode}' for '{node.Code}' was not found.");
    }
  }

  private TaxonomySearchResult CreateSearchResult(ClassificationSystem system, string version, TaxonomyArtifactNode node) =>
    new(system, version, node.Code, node.OfficialLabel, BuildHierarchy(system, node));

  private ReadOnlyCollection<ClassificationNode> BuildHierarchy(ClassificationSystem system, TaxonomyArtifactNode node)
  {
    var hierarchy = new ClassificationNode[node.HierarchyCodes.Length];
    for (int index = 0; index < node.HierarchyCodes.Length; index++)
    {
      string code = NormalizeCode(node.HierarchyCodes[index]);
      if (!nodesByCode.TryGetValue((system, code), out TaxonomyArtifactNode? hierarchyNode))
        throw new InvalidOperationException($"Taxonomy hierarchy for '{node.Code}' references missing node '{code}'.");
      hierarchy[index] = new(hierarchyNode.Level, hierarchyNode.Code, hierarchyNode.OfficialLabel);
    }
    return Array.AsReadOnly(hierarchy);
  }

  private static string NormalizeCode(string code) =>
    ClassificationContracts.RequireText(code, nameof(code)).ToUpperInvariant();

  private static FrozenSet<string> Tokenize(string value) =>
    TokenRegex().Matches(value).Select(match => match.Value.ToUpperInvariant()).ToFrozenSet(StringComparer.Ordinal);

  private static Dictionary<ClassificationSystem, string> LoadEmbeddedArtifacts()
  {
    Assembly assembly = typeof(TaxonomyBroker).Assembly;
    string assemblyName = assembly.GetName().Name!;
    var result = new Dictionary<ClassificationSystem, string>();
    foreach ((ClassificationSystem system, string fileName) in ArtifactFiles)
    {
      string resourceName = $"{assemblyName}.Resources.Taxonomies.{fileName}";
      using Stream stream = assembly.GetManifestResourceStream(resourceName)
        ?? throw new InvalidOperationException($"Embedded taxonomy resource '{resourceName}' was not found.");
      using var reader = new StreamReader(stream, Encoding.UTF8, true);
      result.Add(system, reader.ReadToEnd());
    }
    return result;
  }

  [GeneratedRegex(@"[\p{L}\p{Nd}]+", RegexOptions.CultureInvariant)]
  private static partial Regex TokenRegex();
}
