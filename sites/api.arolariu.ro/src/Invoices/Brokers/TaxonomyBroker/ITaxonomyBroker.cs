namespace arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;

using System;
using System.Collections.Frozen;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;

/// <summary>
/// Defines read-only access to the canonical product and activity taxonomies.
/// </summary>
/// <remarks>
/// <para>
/// <b>Layer role:</b> This broker isolates taxonomy artifact storage and lookup mechanics
/// from classification workflows. Implementations must return canonical labels and
/// hierarchies without applying invoice-domain decision logic.
/// </para>
/// <para>
/// Taxonomy data is versioned by <see cref="ClassificationSystem"/> so callers can retain
/// the exact artifact version used to make a classification decision.
/// </para>
/// </remarks>
/// <example>
/// <code>
/// IReadOnlyList&lt;TaxonomySearchResult&gt; matches =
///   broker.Search(ClassificationSystem.Gs1Gpc, "bread", 10);
/// StandardClassification selected = broker.Resolve(
///   ClassificationSystem.Gs1Gpc,
///   matches[0].Code,
///   ClassificationOrigin.Manual,
///   null,
///   []);
/// </code>
/// </example>
public interface ITaxonomyBroker
{
  /// <summary>
  /// Returns the version of the loaded artifact for a taxonomy system.
  /// </summary>
  /// <param name="system">The canonical taxonomy whose artifact version is required.</param>
  /// <returns>The non-empty version identifier declared by the loaded artifact.</returns>
  /// <exception cref="KeyNotFoundException">
  /// Thrown when <paramref name="system"/> is not supported by the broker.
  /// </exception>
  string GetArtifactVersion(ClassificationSystem system);

  /// <summary>
  /// Searches canonical codes and labels using normalized query tokens.
  /// </summary>
  /// <remarks>
  /// Exact code matches precede token matches. Implementations may impose a safety cap
  /// lower than <paramref name="maximumResults"/>, and return an empty list when no node
  /// matches.
  /// </remarks>
  /// <param name="system">The taxonomy to search.</param>
  /// <param name="query">A non-empty query containing at least one letter or digit.</param>
  /// <param name="maximumResults">The positive upper bound requested by the caller.</param>
  /// <returns>
  /// A read-only, deterministically ordered list of canonical search results.
  /// </returns>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="query"/> is <see langword="null"/>.
  /// </exception>
  /// <exception cref="ArgumentException">
  /// Thrown when <paramref name="query"/> is blank or has no searchable token.
  /// </exception>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when <paramref name="maximumResults"/> is not positive.
  /// </exception>
  /// <exception cref="KeyNotFoundException">
  /// Thrown when <paramref name="system"/> is not supported by the broker.
  /// </exception>
  IReadOnlyList<TaxonomySearchResult> Search(ClassificationSystem system, string query, int maximumResults);

  /// <summary>
  /// Resolves a taxonomy code into a canonical classification snapshot.
  /// </summary>
  /// <param name="system">The taxonomy in which to resolve the code.</param>
  /// <param name="code">The non-empty canonical code; matching is case-insensitive.</param>
  /// <param name="origin">The process that selected the classification.</param>
  /// <param name="confidence">
  /// The analysis confidence in the inclusive range [0, 1], or <see langword="null"/>
  /// for a manual decision.
  /// </param>
  /// <param name="evidence">
  /// Supporting evidence to snapshot into the classification; items cannot be null.
  /// </param>
  /// <returns>
  /// A classification containing the artifact version, official label, and full
  /// root-to-selected-node hierarchy.
  /// </returns>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="code"/> or <paramref name="evidence"/> is
  /// <see langword="null"/>.
  /// </exception>
  /// <exception cref="ArgumentException">
  /// Thrown when textual input is blank, evidence contains a null item, or confidence
  /// does not agree with <paramref name="origin"/>.
  /// </exception>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when <paramref name="confidence"/> is not finite or lies outside [0, 1].
  /// </exception>
  /// <exception cref="TaxonomyCodeNotFoundException">
  /// Thrown when <paramref name="code"/> does not identify a node in
  /// <paramref name="system"/>.
  /// </exception>
  StandardClassification Resolve(
    ClassificationSystem system,
    string code,
    ClassificationOrigin origin,
    double? confidence,
    IReadOnlyList<ClassificationEvidence> evidence);

  /// <summary>
  /// Determines whether a canonical code exists in a taxonomy.
  /// </summary>
  /// <param name="system">The taxonomy to inspect.</param>
  /// <param name="code">The non-empty code to normalize and test.</param>
  /// <returns>
  /// <see langword="true"/> when the normalized code exists; otherwise,
  /// <see langword="false"/>.
  /// </returns>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="code"/> is <see langword="null"/>.
  /// </exception>
  /// <exception cref="ArgumentException">
  /// Thrown when <paramref name="code"/> is empty or whitespace.
  /// </exception>
  bool Contains(ClassificationSystem system, string code);
}

/// <summary>
/// Represents an immutable canonical taxonomy search result.
/// </summary>
/// <remarks>
/// The hierarchy is defensively copied and must end at <see cref="Code"/>, ensuring
/// consumers cannot detach the selected node from its canonical ancestry.
/// </remarks>
public sealed record TaxonomySearchResult
{
  /// <summary>
  /// Initializes a validated snapshot of a matching taxonomy node.
  /// </summary>
  /// <param name="system">The taxonomy containing the selected node.</param>
  /// <param name="version">The non-empty artifact version used for the search.</param>
  /// <param name="code">The non-empty canonical code of the selected node.</param>
  /// <param name="officialLabel">The non-empty official taxonomy label.</param>
  /// <param name="hierarchy">
  /// The non-empty root-to-selected-node hierarchy to copy into the result.
  /// </param>
  /// <exception cref="ArgumentNullException">
  /// Thrown when a text or hierarchy argument is <see langword="null"/>.
  /// </exception>
  /// <exception cref="ArgumentException">
  /// Thrown when text is blank, the hierarchy contains null, or its terminal node does
  /// not match <paramref name="code"/>.
  /// </exception>
  public TaxonomySearchResult(
    ClassificationSystem system,
    string version,
    string code,
    string officialLabel,
    IReadOnlyList<ClassificationNode> hierarchy)
  {
    System = system;
    Version = ClassificationContracts.RequireText(version, nameof(version));
    Code = ClassificationContracts.RequireText(code, nameof(code));
    OfficialLabel = ClassificationContracts.RequireText(officialLabel, nameof(officialLabel));
    Hierarchy = ClassificationContracts.Snapshot(hierarchy, nameof(hierarchy));
    if (Hierarchy.Count == 0 || !string.Equals(Hierarchy[^1].Code, Code, StringComparison.Ordinal))
      throw new ArgumentException("Search result hierarchy must end with the selected code.", nameof(hierarchy));
  }

  /// <summary>Gets the canonical taxonomy in which the match was found.</summary>
  public ClassificationSystem System { get; }

  /// <summary>Gets the source artifact version used to produce the result.</summary>
  public string Version { get; }

  /// <summary>Gets the selected node's canonical taxonomy code.</summary>
  public string Code { get; }

  /// <summary>Gets the selected node's official taxonomy label.</summary>
  public string OfficialLabel { get; }

  /// <summary>Gets the immutable root-to-selected-node canonical hierarchy.</summary>
  public IReadOnlyList<ClassificationNode> Hierarchy { get; }
}

/// <summary>
/// Models the metadata and nodes persisted in one generated taxonomy artifact.
/// </summary>
/// <remarks>
/// This internal transport shape mirrors the embedded JSON contract. Runtime validation
/// and indexing are performed by <see cref="JsonTaxonomyBroker"/>.
/// </remarks>
internal sealed record TaxonomyArtifact
{
  /// <summary>Gets the artifact's wire-level taxonomy identifier.</summary>
  [JsonPropertyName("system")]
  public required string System { get; init; }

  /// <summary>Gets the publisher-defined taxonomy version.</summary>
  [JsonPropertyName("version")]
  public required string Version { get; init; }

  /// <summary>Gets the authoritative source URL recorded during generation.</summary>
  [JsonPropertyName("sourceUrl")]
  public required string SourceUrl { get; init; }

  /// <summary>Gets the timestamp at which the embedded artifact was generated.</summary>
  [JsonPropertyName("generatedAt")]
  public required DateTimeOffset GeneratedAt { get; init; }

  /// <summary>Gets the publisher attribution retained with the artifact.</summary>
  [JsonPropertyName("attribution")]
  public required string Attribution { get; init; }

  /// <summary>Gets the serialized canonical taxonomy nodes.</summary>
  [JsonPropertyName("nodes")]
  public required TaxonomyArtifactNode[] Nodes { get; init; }
}

/// <summary>
/// Models a serialized taxonomy node and its precomputed search material.
/// </summary>
internal sealed record TaxonomyArtifactNode
{
  /// <summary>Gets the publisher-defined canonical node code.</summary>
  [JsonPropertyName("code")]
  public required string Code { get; init; }

  /// <summary>Gets the publisher-defined canonical node label.</summary>
  [JsonPropertyName("officialLabel")]
  public required string OfficialLabel { get; init; }

  /// <summary>Gets the taxonomy-specific hierarchy level name.</summary>
  [JsonPropertyName("level")]
  public required string Level { get; init; }

  /// <summary>Gets the direct parent code, or null for a root node.</summary>
  [JsonPropertyName("parentCode")]
  public string? ParentCode { get; init; }

  /// <summary>Gets the ordered codes from the taxonomy root through this node.</summary>
  [JsonPropertyName("hierarchyCodes")]
  public required string[] HierarchyCodes { get; init; }

  /// <summary>Gets the canonical labels corresponding to <see cref="HierarchyCodes"/>.</summary>
  [JsonPropertyName("hierarchyLabels")]
  public required string[] HierarchyLabels { get; init; }

  /// <summary>Gets the optional publisher definition for the node.</summary>
  [JsonPropertyName("definition")]
  public string? Definition { get; init; }

  /// <summary>Gets the generated text used to build the token search index.</summary>
  [JsonPropertyName("searchText")]
  public required string SearchText { get; init; }

  /// <summary>Gets the case-normalized code used as the runtime lookup key.</summary>
  internal string NormalizedCode { get; init; } = string.Empty;

  /// <summary>Gets the normalized, de-duplicated tokens used for search matching.</summary>
  internal FrozenSet<string> SearchTokens { get; init; } = Enumerable.Empty<string>().ToFrozenSet(StringComparer.Ordinal);
}

/// <summary>
/// Provides source-generated JSON metadata for taxonomy artifact deserialization.
/// </summary>
[JsonSourceGenerationOptions(PropertyNameCaseInsensitive = false)]
[JsonSerializable(typeof(TaxonomyArtifact))]
internal sealed partial class TaxonomyArtifactJsonSerializerContext : JsonSerializerContext;
