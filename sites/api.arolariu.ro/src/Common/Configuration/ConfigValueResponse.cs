namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

/// <summary>Represents the typed response returned by <c>GET /api/v1/config?name={config-key}</c>.</summary>
/// <remarks>
/// <para>
/// Unlike the build-time and run-time endpoints, the config endpoint resolves one indexed
/// configuration value at a time. The response includes documentation metadata so callers
/// can understand where the value belongs and which targets are allowed to request it.
/// </para>
/// </remarks>
public sealed class ConfigValueResponse
{
  /// <summary>Gets the canonical configuration key name, for example <c>Endpoints:Api</c>.</summary>
  [JsonPropertyName("name")]
  public string Name { get; init; } = string.Empty;

  /// <summary>Gets the resolved configuration value for the requested key.</summary>
  [JsonPropertyName("value")]
  public string Value { get; init; } = string.Empty;

  /// <summary>Gets the caller targets that may request this value from exp.</summary>
  [JsonPropertyName("availableForTargets")]
  public IReadOnlyList<string> AvailableForTargets { get; init; } = Array.Empty<string>();

  /// <summary>Gets the build-time and run-time documents that contain this value.</summary>
  [JsonPropertyName("availableInDocuments")]
  public IReadOnlyList<string> AvailableInDocuments { get; init; } = Array.Empty<string>();

  /// <summary>Gets the documents where this value is required rather than optional.</summary>
  [JsonPropertyName("requiredInDocuments")]
  public IReadOnlyList<string> RequiredInDocuments { get; init; } = Array.Empty<string>();

  /// <summary>Gets the short human-readable description of the config value.</summary>
  [JsonPropertyName("description")]
  public string Description { get; init; } = string.Empty;

  /// <summary>Gets the server-authored usage guidance for the config value.</summary>
  [JsonPropertyName("usage")]
  public string Usage { get; init; } = string.Empty;

  /// <summary>Gets the server-recommended refresh interval in seconds.</summary>
  [JsonPropertyName("refreshIntervalSeconds")]
  public int RefreshIntervalSeconds { get; init; } = 300;

  /// <summary>Gets the UTC timestamp at which the exp service resolved this value.</summary>
  [JsonPropertyName("fetchedAt")]
  public DateTimeOffset FetchedAt { get; init; } = DateTimeOffset.UtcNow;
}
