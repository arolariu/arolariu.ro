namespace arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;

using System;
using System.Collections.Frozen;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;

/// <summary>Provides canonical taxonomy lookup and search operations.</summary>
public interface ITaxonomyBroker
{
  /// <summary>Gets the embedded artifact version for a system.</summary>
  string GetArtifactVersion(ClassificationSystem system);

  /// <summary>Searches a taxonomy with a bounded result count.</summary>
  IReadOnlyList<TaxonomySearchResult> Search(ClassificationSystem system, string query, int maximumResults);

  /// <summary>Resolves a canonical code into a trusted classification.</summary>
  /// <exception cref="TaxonomyCodeNotFoundException">Thrown when the code is unknown.</exception>
  StandardClassification Resolve(
    ClassificationSystem system,
    string code,
    ClassificationOrigin origin,
    double? confidence,
    IReadOnlyList<ClassificationEvidence> evidence);

  /// <summary>Determines whether a canonical code exists.</summary>
  bool Contains(ClassificationSystem system, string code);
}

/// <summary>Represents one canonical taxonomy search result.</summary>
public sealed record TaxonomySearchResult
{
  /// <summary>Initializes an immutable search result.</summary>
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

  /// <summary>Gets the taxonomy system.</summary>
  public ClassificationSystem System { get; }
  /// <summary>Gets the artifact version.</summary>
  public string Version { get; }
  /// <summary>Gets the canonical code.</summary>
  public string Code { get; }
  /// <summary>Gets the official label.</summary>
  public string OfficialLabel { get; }
  /// <summary>Gets the canonical hierarchy.</summary>
  public IReadOnlyList<ClassificationNode> Hierarchy { get; }
}

internal sealed record TaxonomyArtifact
{
  [JsonPropertyName("system")] public required string System { get; init; }
  [JsonPropertyName("version")] public required string Version { get; init; }
  [JsonPropertyName("sourceUrl")] public required string SourceUrl { get; init; }
  [JsonPropertyName("generatedAt")] public required DateTimeOffset GeneratedAt { get; init; }
  [JsonPropertyName("attribution")] public required string Attribution { get; init; }
  [JsonPropertyName("nodes")] public required TaxonomyArtifactNode[] Nodes { get; init; }
}

internal sealed record TaxonomyArtifactNode
{
  [JsonPropertyName("code")] public required string Code { get; init; }
  [JsonPropertyName("officialLabel")] public required string OfficialLabel { get; init; }
  [JsonPropertyName("level")] public required string Level { get; init; }
  [JsonPropertyName("parentCode")] public string? ParentCode { get; init; }
  [JsonPropertyName("hierarchyCodes")] public required string[] HierarchyCodes { get; init; }
  [JsonPropertyName("hierarchyLabels")] public required string[] HierarchyLabels { get; init; }
  [JsonPropertyName("definition")] public string? Definition { get; init; }
  [JsonPropertyName("searchText")] public required string SearchText { get; init; }
  internal string NormalizedCode { get; init; } = string.Empty;
  internal FrozenSet<string> SearchTokens { get; init; } = Enumerable.Empty<string>().ToFrozenSet(StringComparer.Ordinal);
}

[JsonSourceGenerationOptions(PropertyNameCaseInsensitive = false)]
[JsonSerializable(typeof(TaxonomyArtifact))]
internal sealed partial class TaxonomyArtifactJsonSerializerContext : JsonSerializerContext;
