namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

/// <summary>Represents the typed response returned by <c>GET /api/v1/build-time?for={target}</c>.</summary>
/// <remarks>
/// <para>The build-time endpoint returns a target-scoped configuration document:
/// a versioned key/value snapshot plus the server-authoritative refresh cadence.</para>
/// <para>Callers should treat <see cref="Version"/> as an opaque hash and refresh their local
/// snapshot according to <see cref="RefreshIntervalSeconds"/>.</para>
/// </remarks>
public sealed class ConfigCatalogResponse
{
  /// <summary>Gets the caller target this catalog describes (for example: <c>api</c>, <c>website</c>).</summary>
  [JsonPropertyName("target")]
  public string Target { get; init; } = string.Empty;

  /// <summary>Gets the schema contract version used to produce this catalog payload.</summary>
  /// <remarks>Empty string when the server has not yet adopted the v2 contract.</remarks>
  [JsonPropertyName("contractVersion")]
  public string ContractVersion { get; init; } = string.Empty;

  /// <summary>Gets the document version identifier (opaque string).</summary>
  [JsonPropertyName("version")]
  public string Version { get; init; } = string.Empty;

  /// <summary>Gets the configuration key/value pairs resolved for the target caller.</summary>
  [JsonPropertyName("config")]
  public IReadOnlyDictionary<string, string> Config { get; init; } = new Dictionary<string, string>();

  /// <summary>Gets the server-recommended interval in seconds at which clients should refresh this catalog.</summary>
  [JsonPropertyName("refreshIntervalSeconds")]
  public int RefreshIntervalSeconds { get; init; } = 300;

  /// <summary>Gets the UTC timestamp at which the exp service produced this payload.</summary>
  [JsonPropertyName("fetchedAt")]
  public DateTimeOffset FetchedAt { get; init; } = DateTimeOffset.UtcNow;
}
