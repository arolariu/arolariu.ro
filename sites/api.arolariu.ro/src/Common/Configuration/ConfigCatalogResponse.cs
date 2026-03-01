namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

/// <summary>Represents the typed response returned by /api/catalog.</summary>
public sealed class ConfigCatalogResponse
{
  /// <summary>Gets or sets the caller target the catalog belongs to.</summary>
  [JsonPropertyName("target")]
  public string Target { get; set; } = string.Empty;

  /// <summary>Gets or sets the catalog version identifier.</summary>
  [JsonPropertyName("version")]
  public string Version { get; set; } = string.Empty;

  /// <summary>Gets or sets the list of required keys for the target caller.</summary>
  [JsonPropertyName("requiredKeys")]
  public IReadOnlyList<string> RequiredKeys { get; set; } = Array.Empty<string>();

  /// <summary>Gets or sets the list of optional keys for the target caller.</summary>
  [JsonPropertyName("optionalKeys")]
  public IReadOnlyList<string> OptionalKeys { get; set; } = Array.Empty<string>();

  /// <summary>Gets or sets the list of allowed key prefixes for the target caller.</summary>
  [JsonPropertyName("allowedPrefixes")]
  public IReadOnlyList<string> AllowedPrefixes { get; set; } = Array.Empty<string>();

  /// <summary>Gets or sets the recommended refresh interval in seconds.</summary>
  [JsonPropertyName("refreshIntervalSeconds")]
  public int RefreshIntervalSeconds { get; set; } = 300;
}
