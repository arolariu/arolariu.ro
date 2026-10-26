namespace arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;

using System;
using System.Collections.Frozen;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;

/// <summary>
/// Provides immutable taxonomy lookup over validated generated JSON artifacts.
/// </summary>
/// <remarks>
/// <para>
/// The broker eagerly deserializes and validates every supported taxonomy, then builds
/// frozen indexes for lock-free reads. It is therefore suitable for singleton
/// registration after successful construction.
/// </para>
/// <para>
/// Search normalizes case and diacritics, prioritizes exact code matches, and caps
/// results at 50. Resolution returns canonical labels and hierarchy data from the
/// artifact rather than trusting caller-supplied display values.
/// </para>
/// <para>
/// <b>Layer role:</b> This type performs artifact I/O and lookup only; it does not choose
/// a classification or apply invoice workflow rules.
/// </para>
/// </remarks>
/// <example>
/// <code>
/// var broker = new JsonTaxonomyBroker();
/// IReadOnlyList&lt;TaxonomySearchResult&gt; results =
///   broker.Search(ClassificationSystem.EcoicopV2, "food", 10);
/// </code>
/// </example>
public sealed partial class JsonTaxonomyBroker : ITaxonomyBroker
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

  /// <summary>
  /// Initializes the broker from the taxonomy artifacts embedded in the assembly.
  /// </summary>
  /// <remarks>
  /// Construction eagerly loads every supported system and fails atomically if any
  /// resource or artifact violates the canonical artifact contract.
  /// </remarks>
  /// <exception cref="InvalidOperationException">
  /// Thrown when an embedded resource is missing, cannot be deserialized, declares the
  /// wrong system, or contains invalid nodes or hierarchy relationships.
  /// </exception>
  /// <exception cref="JsonException">
  /// Thrown when an embedded artifact does not conform to the generated JSON contract.
  /// </exception>
  /// <exception cref="ArgumentException">
  /// Thrown when required artifact text or hierarchy values are blank or null.
  /// </exception>
  public JsonTaxonomyBroker() : this(LoadEmbeddedArtifacts()) { }

  /// <summary>
  /// Initializes the broker from caller-provided taxonomy artifact JSON.
  /// </summary>
  /// <param name="artifactJsonBySystem">
  /// One non-empty JSON artifact for every <see cref="ClassificationSystem"/>.
  /// </param>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="artifactJsonBySystem"/> or required artifact content is
  /// <see langword="null"/>.
  /// </exception>
  /// <exception cref="ArgumentException">
  /// Thrown when a system is missing or required artifact content is blank.
  /// </exception>
  /// <exception cref="JsonException">
  /// Thrown when an artifact does not conform to the generated JSON contract.
  /// </exception>
  /// <exception cref="InvalidOperationException">
  /// Thrown when deserialized metadata, node uniqueness, or hierarchy integrity is
  /// invalid.
  /// </exception>
  public JsonTaxonomyBroker(IReadOnlyDictionary<ClassificationSystem, string> artifactJsonBySystem)
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
    ArgumentNullException.ThrowIfNull(artifact.Nodes);

    if (artifact.Nodes.Length == 0)
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

      for (int index = 0; index < node.HierarchyCodes.Length; index++)
      {
        string hierarchyCode = NormalizeCode(node.HierarchyCodes[index]);
        if (!nodes.TryGetValue(hierarchyCode, out TaxonomyArtifactNode? hierarchyNode))
          throw new InvalidOperationException($"Taxonomy hierarchy code '{node.HierarchyCodes[index]}' for '{node.Code}' was not found.");
        if (!string.Equals(hierarchyNode.OfficialLabel, node.HierarchyLabels[index], StringComparison.Ordinal))
          throw new InvalidOperationException($"Taxonomy hierarchy label for '{node.HierarchyCodes[index]}' does not match its canonical node.");

        string? expectedParentCode = index == 0 ? null : NormalizeCode(node.HierarchyCodes[index - 1]);
        string? actualParentCode = hierarchyNode.ParentCode is null ? null : NormalizeCode(hierarchyNode.ParentCode);
        if (!string.Equals(actualParentCode, expectedParentCode, StringComparison.Ordinal))
          throw new InvalidOperationException($"Taxonomy hierarchy for '{node.Code}' does not follow the declared parent chain.");
      }

      string? expectedNodeParent = node.HierarchyCodes.Length == 1
        ? null
        : NormalizeCode(node.HierarchyCodes[^2]);
      string? actualNodeParent = node.ParentCode is null ? null : NormalizeCode(node.ParentCode);
      if (!string.Equals(actualNodeParent, expectedNodeParent, StringComparison.Ordinal))
        throw new InvalidOperationException($"Taxonomy parent for '{node.Code}' does not match its hierarchy.");
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

  private static FrozenSet<string> Tokenize(string value)
  {
    string normalized = value
      .Normalize(NormalizationForm.FormD)
      .Where(character => CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
      .Aggregate(new StringBuilder(), (builder, character) => builder.Append(character))
      .ToString()
      .Normalize(NormalizationForm.FormC)
      .ToUpperInvariant();

    return TokenRegex().Matches(normalized).Select(match => match.Value).ToFrozenSet(StringComparer.Ordinal);
  }

  private static Dictionary<ClassificationSystem, string> LoadEmbeddedArtifacts()
  {
    Assembly assembly = typeof(JsonTaxonomyBroker).Assembly;
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
