namespace arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;

using System;
using System.Collections.Frozen;
using System.Linq;
using System.Text.Json.Serialization;

internal sealed record TaxonomyArtifact
{
  [JsonPropertyName("system")]
  public required string System { get; init; }

  [JsonPropertyName("version")]
  public required string Version { get; init; }

  [JsonPropertyName("sourceUrl")]
  public required string SourceUrl { get; init; }

  [JsonPropertyName("generatedAt")]
  public required DateTimeOffset GeneratedAt { get; init; }

  [JsonPropertyName("attribution")]
  public required string Attribution { get; init; }

  [JsonPropertyName("nodes")]
  public required TaxonomyArtifactNode[] Nodes { get; init; }
}

internal sealed record TaxonomyArtifactNode
{
  [JsonPropertyName("code")]
  public required string Code { get; init; }

  [JsonPropertyName("officialLabel")]
  public required string OfficialLabel { get; init; }

  [JsonPropertyName("level")]
  public required string Level { get; init; }

  [JsonPropertyName("parentCode")]
  public string? ParentCode { get; init; }

  [JsonPropertyName("hierarchyCodes")]
  public required string[] HierarchyCodes { get; init; }

  [JsonPropertyName("hierarchyLabels")]
  public required string[] HierarchyLabels { get; init; }

  [JsonPropertyName("definition")]
  public string? Definition { get; init; }

  [JsonPropertyName("searchText")]
  public required string SearchText { get; init; }

  internal string NormalizedCode { get; init; } = string.Empty;

  internal FrozenSet<string> SearchTokens { get; init; } = Enumerable.Empty<string>().ToFrozenSet(StringComparer.Ordinal);
}

[JsonSourceGenerationOptions(PropertyNameCaseInsensitive = false)]
[JsonSerializable(typeof(TaxonomyArtifact))]
internal sealed partial class TaxonomyArtifactJsonSerializerContext : JsonSerializerContext;
