namespace arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;

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

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Provides an in-memory taxonomy broker backed by generated JSON taxonomy artifacts.
/// </summary>
/// <remarks>
/// <para><b>Lifecycle:</b> Load this broker as a singleton so embedded taxonomy artifacts are parsed and indexed only once per application lifetime.</para>
/// <para><b>Behavior:</b> Construction validates artifact shape strictly and builds immutable frozen dictionaries for low-allocation search and resolve operations.</para>
/// <para><b>Testing:</b> A secondary constructor allows injection of deterministic JSON artifacts while still exercising the real parsing and indexing code path.</para>
/// </remarks>
public sealed partial class JsonTaxonomyBroker : ITaxonomyBroker
{
  private const int MaximumSearchResultLimit = 50;

  private static readonly FrozenDictionary<ClassificationSystem, string> EmbeddedArtifactFiles =
    new Dictionary<ClassificationSystem, string>
    {
      [ClassificationSystem.Gs1Gpc] = "gpc-2026-05.min.json",
      [ClassificationSystem.EcoicopV2] = "ecoicop-v2.min.json",
      [ClassificationSystem.Nace21] = "nace-2.1.min.json",
    }.ToFrozenDictionary();

  private static readonly FrozenDictionary<ClassificationSystem, string> ExpectedArtifactSystemNames =
    new Dictionary<ClassificationSystem, string>
    {
      [ClassificationSystem.Gs1Gpc] = "GS1_GPC",
      [ClassificationSystem.EcoicopV2] = "ECOICOP_V2",
      [ClassificationSystem.Nace21] = "NACE_2_1",
    }.ToFrozenDictionary();

  private readonly FrozenDictionary<ClassificationSystem, TaxonomyArtifact> artifacts;
  private readonly FrozenDictionary<(ClassificationSystem System, string Code), TaxonomyArtifactNode> nodesByCode;

  /// <summary>
  /// Initializes a new instance of the <see cref="JsonTaxonomyBroker"/> class using embedded taxonomy artifacts.
  /// </summary>
  public JsonTaxonomyBroker()
    : this(LoadEmbeddedArtifacts())
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="JsonTaxonomyBroker"/> class using injected raw JSON taxonomy artifacts.
  /// </summary>
  /// <param name="artifactJsonBySystem">The raw JSON artifact payloads keyed by taxonomy system.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="artifactJsonBySystem"/> is null.</exception>
  /// <exception cref="ArgumentException">Thrown when any supported taxonomy system is missing or a JSON payload is empty.</exception>
  /// <exception cref="InvalidOperationException">Thrown when a taxonomy artifact cannot be deserialized or fails structural validation.</exception>
  public JsonTaxonomyBroker(IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem)
  {
    ArgumentNullException.ThrowIfNull(artifactJsonBySystem);

    EnsureAllSystemsAreProvided(artifactJsonBySystem);

    var loadedArtifacts = Enum
      .GetValues<ClassificationSystem>()
      .Select(system => new KeyValuePair<ClassificationSystem, TaxonomyArtifact>(
        system,
        DeserializeAndIndexArtifact(system, artifactJsonBySystem[system])))
      .ToArray();

    artifacts = loadedArtifacts.ToFrozenDictionary(item => item.Key, item => item.Value);
    nodesByCode = BuildNodeIndex(loadedArtifacts);
  }

  /// <inheritdoc />
  public IReadOnlyList<TaxonomySearchResult> Search(
    ClassificationSystem system,
    string query,
    int maximumResults)
  {
    string trimmedQuery = ClassificationContracts.RequireText(query, nameof(query));

    if (maximumResults <= 0)
    {
      throw new ArgumentOutOfRangeException(nameof(maximumResults), maximumResults, "Maximum results must be greater than zero.");
    }

    string normalizedQueryCode = NormalizeCode(trimmedQuery);
    FrozenSet<string> queryTokens = Tokenize(trimmedQuery);

    if (queryTokens.Count == 0)
    {
      throw new ArgumentException("Search query must contain at least one letter or digit.", nameof(query));
    }

    TaxonomyArtifact artifact = artifacts[system];
    int boundedMaximumResults = Math.Min(maximumResults, MaximumSearchResultLimit);

    TaxonomySearchResult[] results = artifact.Nodes
      .Select(node => new TaxonomySearchCandidate(
        Node: node,
        IsExactCodeMatch: string.Equals(node.NormalizedCode, normalizedQueryCode, StringComparison.Ordinal),
        Score: CalculateTokenOverlap(node.SearchTokens, queryTokens)))
      .Where(candidate => candidate.IsExactCodeMatch || candidate.Score > 0)
      .OrderByDescending(candidate => candidate.IsExactCodeMatch)
      .ThenByDescending(candidate => candidate.Score)
      .ThenBy(candidate => candidate.Node.Code, StringComparer.Ordinal)
      .Take(boundedMaximumResults)
      .Select(candidate => CreateSearchResult(system, artifact.Version, candidate.Node))
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
    {
      throw new TaxonomyCodeNotFoundException(system, code);
    }

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

  private static FrozenDictionary<(ClassificationSystem System, string Code), TaxonomyArtifactNode> BuildNodeIndex(
    IReadOnlyList<KeyValuePair<ClassificationSystem, TaxonomyArtifact>> loadedArtifacts)
  {
    var nodes = loadedArtifacts
      .SelectMany(item => item.Value.Nodes.Select(node => new KeyValuePair<(ClassificationSystem System, string Code), TaxonomyArtifactNode>(
        (item.Key, node.NormalizedCode),
        node)))
      .ToArray();

    return nodes.ToFrozenDictionary(item => item.Key, item => item.Value);
  }

  private static TaxonomyArtifact DeserializeAndIndexArtifact(ClassificationSystem system, string artifactJson)
  {
    string trimmedArtifactJson = ClassificationContracts.RequireText(artifactJson, nameof(artifactJson));

    TaxonomyArtifact artifact = JsonSerializer.Deserialize(
      trimmedArtifactJson,
      TaxonomyArtifactJsonSerializerContext.Default.TaxonomyArtifact)
      ?? throw new InvalidOperationException($"Failed to deserialize taxonomy artifact for '{system}'.");

    ValidateArtifactEnvelope(system, artifact);

    var indexedNodesByCode = new Dictionary<string, TaxonomyArtifactNode>(StringComparer.Ordinal);

    foreach (TaxonomyArtifactNode node in artifact.Nodes)
    {
      TaxonomyArtifactNode indexedNode = IndexNode(node);

      if (!indexedNodesByCode.TryAdd(indexedNode.NormalizedCode, indexedNode))
      {
        throw new InvalidOperationException($"Duplicate taxonomy code '{indexedNode.Code}' detected for '{system}'.");
      }
    }

    ValidateArtifactHierarchy(system, indexedNodesByCode);

    return artifact with { Nodes = indexedNodesByCode.Values.ToArray() };
  }

  private static TaxonomyArtifactNode IndexNode(TaxonomyArtifactNode node)
  {
    ArgumentNullException.ThrowIfNull(node);

    string code = ClassificationContracts.RequireText(node.Code, nameof(node.Code));
    string officialLabel = ClassificationContracts.RequireText(node.OfficialLabel, nameof(node.OfficialLabel));
    string level = ClassificationContracts.RequireText(node.Level, nameof(node.Level));
    string searchText = ClassificationContracts.RequireText(node.SearchText, nameof(node.SearchText));
    string? parentCode = string.IsNullOrWhiteSpace(node.ParentCode) ? null : node.ParentCode.Trim();
    string[] hierarchyCodes = ValidateHierarchyValues(node.HierarchyCodes, nameof(node.HierarchyCodes));
    string[] hierarchyLabels = ValidateHierarchyValues(node.HierarchyLabels, nameof(node.HierarchyLabels));

    return node with
    {
      Code = code,
      OfficialLabel = officialLabel,
      Level = level,
      ParentCode = parentCode,
      SearchText = searchText,
      HierarchyCodes = hierarchyCodes,
      HierarchyLabels = hierarchyLabels,
      Definition = string.IsNullOrWhiteSpace(node.Definition) ? null : node.Definition.Trim(),
      NormalizedCode = NormalizeCode(code),
      SearchTokens = Tokenize(searchText),
    };
  }

  private static string[] ValidateHierarchyValues(string[] values, string parameterName)
  {
    ArgumentNullException.ThrowIfNull(values);

    if (values.Length == 0)
    {
      throw new InvalidOperationException($"Taxonomy artifact collection '{parameterName}' must contain at least one item.");
    }

    var trimmedValues = new string[values.Length];

    for (int index = 0; index < values.Length; index++)
    {
      trimmedValues[index] = ClassificationContracts.RequireText(values[index], parameterName);
    }

    return trimmedValues;
  }

  private static void ValidateArtifactEnvelope(ClassificationSystem system, TaxonomyArtifact artifact)
  {
    ArgumentNullException.ThrowIfNull(artifact);

    string artifactSystemName = ClassificationContracts.RequireText(artifact.System, nameof(artifact.System));
    string expectedSystemName = ExpectedArtifactSystemNames[system];

    if (!string.Equals(artifactSystemName, expectedSystemName, StringComparison.Ordinal))
    {
      throw new InvalidOperationException($"Taxonomy artifact for '{system}' declared system '{artifactSystemName}' instead of '{expectedSystemName}'.");
    }

    _ = ClassificationContracts.RequireText(artifact.Version, nameof(artifact.Version));
    _ = ClassificationContracts.RequireText(artifact.SourceUrl, nameof(artifact.SourceUrl));
    _ = ClassificationContracts.RequireText(artifact.Attribution, nameof(artifact.Attribution));
    ArgumentNullException.ThrowIfNull(artifact.Nodes);
  }

  private static void ValidateArtifactHierarchy(
    ClassificationSystem system,
    Dictionary<string, TaxonomyArtifactNode> nodesByNormalizedCode)
  {
    foreach ((string _, TaxonomyArtifactNode node) in nodesByNormalizedCode)
    {
      if (node.HierarchyCodes.Length != node.HierarchyLabels.Length)
      {
        throw new InvalidOperationException($"Taxonomy artifact for '{system}' contains mismatched hierarchy arrays for code '{node.Code}'.");
      }

      string normalizedTerminalHierarchyCode = NormalizeCode(node.HierarchyCodes[^1]);

      if (!string.Equals(normalizedTerminalHierarchyCode, node.NormalizedCode, StringComparison.Ordinal))
      {
        throw new InvalidOperationException($"Taxonomy artifact for '{system}' contains hierarchy for code '{node.Code}' that does not end with the node itself.");
      }

      if (node.ParentCode is not null && !nodesByNormalizedCode.ContainsKey(NormalizeCode(node.ParentCode)))
      {
        throw new InvalidOperationException($"Taxonomy artifact for '{system}' references missing parent code '{node.ParentCode}' for node '{node.Code}'.");
      }

      foreach (string hierarchyCode in node.HierarchyCodes)
      {
        string normalizedHierarchyCode = NormalizeCode(hierarchyCode);

        if (!nodesByNormalizedCode.ContainsKey(normalizedHierarchyCode))
        {
          throw new InvalidOperationException($"Taxonomy artifact for '{system}' references missing hierarchy code '{hierarchyCode}' for node '{node.Code}'.");
        }
      }
    }
  }

  private TaxonomySearchResult CreateSearchResult(
    ClassificationSystem system,
    string version,
    TaxonomyArtifactNode node) =>
      new(
        system,
        version,
        node.Code,
        node.OfficialLabel,
        BuildHierarchy(system, node));

  private ReadOnlyCollection<ClassificationNode> BuildHierarchy(ClassificationSystem system, TaxonomyArtifactNode node)
  {
    var hierarchy = new ClassificationNode[node.HierarchyCodes.Length];

    for (int index = 0; index < node.HierarchyCodes.Length; index++)
    {
      string hierarchyCode = NormalizeCode(node.HierarchyCodes[index]);

      if (!nodesByCode.TryGetValue((system, hierarchyCode), out TaxonomyArtifactNode? hierarchyNode))
      {
        throw new InvalidOperationException($"Taxonomy artifact hierarchy for '{node.Code}' references missing node '{node.HierarchyCodes[index]}'.");
      }

      hierarchy[index] = new ClassificationNode(
        hierarchyNode.Level,
        hierarchyNode.Code,
        hierarchyNode.OfficialLabel);
    }

    return Array.AsReadOnly(hierarchy);
  }

  private static FrozenSet<string> Tokenize(string value)
  {
    var tokens = TaxonomyTokenRegex()
      .Matches(value)
      .Select(match => match.Value.ToUpperInvariant())
      .ToArray();

    return tokens.ToFrozenSet(StringComparer.Ordinal);
  }

  private static double CalculateTokenOverlap(FrozenSet<string> nodeTokens, FrozenSet<string> queryTokens)
  {
    if (queryTokens.Count == 0)
    {
      return 0;
    }

    int overlapCount = 0;

    foreach (string queryToken in queryTokens)
    {
      if (nodeTokens.Contains(queryToken))
      {
        overlapCount++;
      }
    }

    return (double)overlapCount / queryTokens.Count;
  }

  private static string NormalizeCode(string code) =>
    ClassificationContracts.RequireText(code, nameof(code)).ToUpperInvariant();

  private static Dictionary<ClassificationSystem, string> LoadEmbeddedArtifacts()
  {
    Assembly assembly = typeof(JsonTaxonomyBroker).Assembly;
    string assemblyName = assembly.GetName().Name
      ?? throw new InvalidOperationException("Unable to determine invoices assembly name for taxonomy resources.");

    var artifactsBySystem = new Dictionary<ClassificationSystem, string>();

    foreach ((ClassificationSystem system, string fileName) in EmbeddedArtifactFiles)
    {
      string resourceName = $"{assemblyName}.Resources.Taxonomies.{fileName}";
      using Stream stream = assembly.GetManifestResourceStream(resourceName)
        ?? throw new InvalidOperationException($"Embedded taxonomy resource '{resourceName}' was not found.");
      using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
      artifactsBySystem.Add(system, reader.ReadToEnd());
    }

    return artifactsBySystem;
  }

  private static void EnsureAllSystemsAreProvided(IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem)
  {
    foreach (ClassificationSystem system in Enum.GetValues<ClassificationSystem>())
    {
      if (!artifactJsonBySystem.ContainsKey(system))
      {
        throw new ArgumentException($"Missing taxonomy artifact for '{system}'.", nameof(artifactJsonBySystem));
      }
    }
  }

  [GeneratedRegex(@"[\p{L}\p{Nd}]+", RegexOptions.CultureInvariant)]
  private static partial Regex TaxonomyTokenRegex();

  private sealed record TaxonomySearchCandidate(
    TaxonomyArtifactNode Node,
    bool IsExactCodeMatch,
    double Score);
}
